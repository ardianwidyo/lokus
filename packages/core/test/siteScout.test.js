import { describe, expect, it } from 'vitest';

import { createSeededPlacesAdapter } from '../src/adapters/places.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import {
  CANDIDATE_WEIGHTS,
  CLEAR_DISTANCE_KM,
  cannibalisationFactor,
  scoutSites,
} from '../src/location/siteScout.js';

const TENANT = 'nusa-retail';
const scout = (overrides = {}) =>
  scoutSites({ tenantId: TENANT, places: createSeededPlacesAdapter(), ...overrides });

describe('cannibalisation as a score factor', () => {
  it('is full marks when there is no own branch to compete with', () => {
    expect(cannibalisationFactor(null)).toBe(100);
  });

  it('reaches full marks at the clear distance', () => {
    expect(cannibalisationFactor(CLEAR_DISTANCE_KM)).toBe(100);
    expect(cannibalisationFactor(CLEAR_DISTANCE_KM + 5)).toBe(100);
  });

  it('scores a site on top of an existing branch at zero', () => {
    expect(cannibalisationFactor(0)).toBe(0);
  });

  it('falls proportionally in between', () => {
    expect(cannibalisationFactor(1.5)).toBe(50);
  });
});

describe('scoutSites (T035)', () => {
  it('scores candidates on cannibalisation where an outlet scores on parking', () => {
    // A site you are considering and a shop you already run are not judged the
    // same way; substituting the fourth factor is the whole difference.
    expect(Object.keys(CANDIDATE_WEIGHTS)).toEqual([
      'traffic',
      'mix',
      'competitors',
      'cannibalisation',
    ]);
  });

  it('returns three ranked candidates, best first', async () => {
    const { data } = await scout();
    const totals = data.recommended.map((c) => c.total);

    expect(data.recommended).toHaveLength(3);
    expect(data.recommended.map((c) => c.rank)).toEqual([1, 2, 3]);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
  });

  it('gives each candidate its four factors and the weights applied', async () => {
    const [best] = (await scout()).data.recommended;

    expect(Object.keys(best.factors)).toEqual(['traffic', 'mix', 'competitors', 'cannibalisation']);
    expect(Object.values(best.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(best.labels.cannibalisation).toBe('Kanibalisasi');
  });

  it('does not fold in the outlet weights, which would leave a factor with no data', async () => {
    const [best] = (await scout()).data.recommended;

    expect(best.weights.access).toBeUndefined();
  });

  it('counts competitors around the candidate, not around the nearest branch', async () => {
    // The first version anchored Places to the nearest outlet at any distance,
    // so a site 7 km away inherited that branch's competitors.
    const { data } = await scout();
    const cibubur = data.recommended.find((c) => c.id === 'cibubur-junction');
    const places = createSeededPlacesAdapter();
    const atCandidate = await places.nearbyCompetitors({ geo: cibubur.geo, radiusM: 800 });

    expect(cibubur.competitorCount).toBe(atCandidate.data.total);
  });

  it('writes reasoning from the candidate\'s own numbers', async () => {
    const { data } = await scout();

    for (const candidate of data.recommended) {
      expect(candidate.reasoning).toContain(String(candidate.competitorCount));
      expect(candidate.reasoning).toContain(candidate.nearestOwn.name);
    }
  });

  it('never claims a site is clear of competitors when it is not', async () => {
    const { data } = await scout();

    for (const candidate of data.recommended) {
      if (candidate.competitorCount > 0) {
        expect(candidate.reasoning).not.toMatch(/Tidak ada minimarket sejenis/);
      }
    }
  });

  it('names the trade-off on a high-traffic, crowded site', async () => {
    const { data } = await scout({
      candidates: [
        {
          id: 'ramai',
          name: 'Pasar ramai',
          area: 'Jakarta',
          geo: { lat: -6.18, lng: 106.83 },
          surveyed: { traffic: 96, mix: 70 },
          context: 'Pasar harian',
        },
      ],
      limit: 1,
    });
    const [site] = data.recommended;

    if (site.factors.competitors < 60) {
      expect(site.reasoning).toMatch(/strateginya harga, bukan kenyamanan/);
    }
  });

  it('shows what it rejected and why, rather than dropping it silently', async () => {
    // A filter nobody can see is indistinguishable from no filter.
    const { data } = await scout();

    expect(data.rejected.length).toBeGreaterThan(0);
    expect(data.rejected[0].reason).toMatch(/di bawah ambang 1,2 km/);
    expect(data.rejected[0].nearestOwnKm).toBeLessThan(1.2);
  });

  it('does not promote a rejected site into the ranking to make the rule visible', async () => {
    const { data } = await scout();
    const recommendedIds = data.recommended.map((c) => c.id);

    for (const rejected of data.rejected) {
      expect(recommendedIds).not.toContain(rejected.id);
    }
  });

  it('reports how many were considered and how many passed the filter', async () => {
    const { data } = await scout();

    expect(data.considered).toBeGreaterThan(data.recommended.length);
    expect(data.passedFilter).toBeLessThanOrEqual(data.considered);
    expect(data.poiCount).toBeGreaterThan(0);
  });

  it('cites the places and branches behind every candidate', async () => {
    const result = await scout();

    expect(result.sources.some((s) => s.type === 'place')).toBe(true);
    expect(result.sources.some((s) => s.type === 'outlet')).toBe(true);
  });

  it('says which factors are measured and which surveyed', async () => {
    const [best] = (await scout()).data.recommended;

    expect(best.derivedFactors).toEqual(['competitors', 'cannibalisation']);
    expect(best.surveyedFactors).toEqual(['traffic', 'mix']);
  });

  it('lets a tenant reweight what it cares about', async () => {
    const balanced = await scout();
    const trafficHeavy = await scout({
      weights: { traffic: 0.7, mix: 0.1, competitors: 0.1, cannibalisation: 0.1 },
    });

    expect(trafficHeavy.data.recommended[0].total).not.toBe(balanced.data.recommended[0].total);
  });

  it('measures cannibalisation against the calling tenant\'s branches only', async () => {
    // Another tenant owns nothing here, so nothing can be cannibalised.
    const { data } = await scout({ tenantId: 'klinik-sehat-prima' });

    expect(data.rejected).toHaveLength(0);
    expect(data.recommended.every((c) => c.factors.cannibalisation === 100)).toBe(true);
  });

  it('refuses without a tenant id', async () => {
    await expect(scoutSites({ places: createSeededPlacesAdapter() })).rejects.toBeInstanceOf(
      TenantScopeError,
    );
  });
});
