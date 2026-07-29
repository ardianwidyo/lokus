import { describe, expect, it } from 'vitest';

import { createSeededPlacesAdapter } from '../src/adapters/places.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import {
  COMPETITOR_PENALTY,
  DEFAULT_WEIGHTS,
  LocationScoreError,
  competitorFactor,
  locationScore,
  normaliseWeights,
  scoreFrom,
} from '../src/location/locationScore.js';

const TENANT = 'nusa-retail';
const places = () => createSeededPlacesAdapter();

const score = (outletId, overrides = {}) =>
  locationScore({ tenantId: TENANT, outletId, places: places(), ...overrides });

describe('weights (AC-5.1)', () => {
  it('defaults to four weights summing to one', () => {
    expect(Object.keys(DEFAULT_WEIGHTS)).toEqual(['traffic', 'mix', 'competitors', 'access']);
    expect(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('renormalises weights an admin sets, so the score stays on 0–100', () => {
    // Weights summing to 2 must not double the score.
    const doubled = normaliseWeights({ traffic: 0.7, mix: 0.5, competitors: 0.5, access: 0.3 });

    expect(Object.values(doubled).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(scoreFrom({ traffic: 80, mix: 80, competitors: 80, access: 80 }, doubled)).toBe(80);
  });

  it('refuses weights that sum to nothing rather than dividing by zero', () => {
    expect(() => normaliseWeights({ traffic: 0, mix: 0, competitors: 0, access: 0 })).toThrow(
      LocationScoreError,
    );
  });

  it('lets a tenant that cares about competitors reorder the ranking', async () => {
    const balanced = await score('BKS-02');
    const competitorHeavy = await score('BKS-02', {
      weights: { traffic: 0.1, mix: 0.1, competitors: 0.7, access: 0.1 },
    });

    // Bekasi has five competitors; weighting that harder must lower its score.
    expect(competitorHeavy.data.total).toBeLessThan(balanced.data.total);
  });
});

describe('the competitor factor is derived, not seeded', () => {
  it('falls by a fixed amount per competing place', () => {
    expect(competitorFactor(0)).toBe(100);
    expect(competitorFactor(5)).toBe(100 - 5 * COMPETITOR_PENALTY);
  });

  it('never goes below zero however crowded the area', () => {
    expect(competitorFactor(50)).toBe(0);
  });

  it('matches the count the Places adapter actually returned', async () => {
    const result = await score('DPK-01');

    expect(result.data.factors.competitors).toBe(competitorFactor(result.data.competitorCount));
  });

  it('says which factors are measured and which are surveyed', async () => {
    const { data } = await score('BKS-02');

    // Presenting a surveyed footfall figure as measured would be the
    // untraceable number the constitution forbids.
    expect(data.derivedFactors).toEqual(['competitors']);
    expect(data.surveyedFactors).toEqual(['traffic', 'mix', 'access']);
  });
});

describe('bq.locationScore', () => {
  it('exposes all four factors, their weights and their labels (AC-5.1)', async () => {
    const { data } = await score('BKS-02');

    expect(Object.keys(data.factors)).toEqual(['traffic', 'mix', 'competitors', 'access']);
    expect(data.weights.traffic).toBe(DEFAULT_WEIGHTS.traffic);
    expect(data.labels.competitors).toBe('Kepadatan pesaing');
  });

  it('cites the places behind the competitor factor', async () => {
    const result = await score('BKS-02');

    expect(result.sources.length).toBe(result.data.competitorCount);
    expect(result.sources[0].type).toBe('place');
  });

  it('ranks Depok worst and Bogor best across the network', async () => {
    const adapter = places();
    const scored = await Promise.all(
      ['BKS-02', 'CKR-01', 'DPK-01', 'SRP-03', 'BGR-01', 'TGR-01'].map(async (id) => ({
        id,
        total: (await locationScore({ tenantId: TENANT, outletId: id, places: adapter })).data.total,
      })),
    );
    const ascending = [...scored].sort((a, b) => a.total - b.total);

    expect(ascending[0].id).toBe('DPK-01');
    expect(ascending.at(-1).id).toBe('BGR-01');
  });

  it('flags the new competitor near Depok', async () => {
    expect((await score('DPK-01')).data.newCompetitorCount).toBe(1);
  });

  it('scores a candidate site from coordinates alone', async () => {
    const { data } = await locationScore({
      tenantId: TENANT,
      geo: { lat: -6.36, lng: 106.9 },
      places: places(),
      surveyed: { traffic: 91, mix: 86, access: 88 },
    });

    expect(data.outletId).toBeNull();
    expect(data.total).toBeGreaterThan(0);
  });

  it('refuses another tenant\'s outlet the same way as a missing one', async () => {
    await expect(
      locationScore({ tenantId: 'dealer-arta-motor', outletId: 'BKS-02', places: places() }),
    ).rejects.toMatchObject({ code: 'OUTLET_NOT_FOUND' });
    await expect(score('XXX-99')).rejects.toMatchObject({ code: 'OUTLET_NOT_FOUND' });
  });

  it('refuses with neither an outlet nor a coordinate, and with no tenant', async () => {
    await expect(locationScore({ tenantId: TENANT, places: places() })).rejects.toMatchObject({
      code: 'TARGET_REQUIRED',
    });
    await expect(locationScore({ places: places() })).rejects.toBeInstanceOf(TenantScopeError);
  });
});
