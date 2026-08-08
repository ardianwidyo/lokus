import { describe, expect, it } from 'vitest';

import { createSeededPlacesAdapter } from '../src/adapters/places.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import {
  COMPETITOR_SHARE_WEIGHT,
  CompareError,
  VISITS_BAND,
  VISITS_PER_TRAFFIC_POINT,
  compareSites,
  estimateDailyVisits,
} from '../src/location/compareSites.js';

const TENANT = 'nusa-retail';
const compare = (overrides = {}) =>
  compareSites({ tenantId: TENANT, places: createSeededPlacesAdapter(), ...overrides });

describe('the daily-visits model', () => {
  it('states its coefficients rather than hiding them behind a number', () => {
    expect(VISITS_PER_TRAFFIC_POINT).toBe(8);
    expect(COMPETITOR_SHARE_WEIGHT).toBe(0.15);
    expect(VISITS_BAND).toBe(0.12);
  });

  it('falls as competitors rise, holding traffic constant', () => {
    const alone = estimateDailyVisits({ traffic: 90, competitorCount: 0 });
    const crowded = estimateDailyVisits({ traffic: 90, competitorCount: 6 });

    expect(crowded.centre).toBeLessThan(alone.centre);
  });

  it('rises with traffic, holding competitors constant', () => {
    const quiet = estimateDailyVisits({ traffic: 60, competitorCount: 3 });
    const busy = estimateDailyVisits({ traffic: 95, competitorCount: 3 });

    expect(busy.centre).toBeGreaterThan(quiet.centre);
  });

  it('returns a band around the centre, never a single false-precision figure', () => {
    const estimate = estimateDailyVisits({ traffic: 90, competitorCount: 2 });

    expect(estimate.low).toBeLessThan(estimate.centre);
    expect(estimate.high).toBeGreaterThan(estimate.centre);
  });
});

describe('compareSites (AC-5.3)', () => {
  it('compares two candidates factor by factor', async () => {
    const { data } = await compare();

    expect(data.rows.length).toBeGreaterThanOrEqual(6);
    expect(data.a.id).not.toBe(data.b.id);
    for (const row of data.rows) {
      expect(row.display.a).toEqual(expect.any(String));
      expect(row.display.b).toEqual(expect.any(String));
    }
  });

  it('says where every row\'s number came from', async () => {
    const { data } = await compare();

    for (const row of data.rows) {
      expect(['terukur', 'survei', 'perkiraan']).toContain(row.origin);
    }
    // All three provenances appear: presenting a model as a measurement is
    // exactly the untraceable number the constitution forbids.
    expect(new Set(data.rows.map((r) => r.origin)).size).toBe(3);
  });

  it('marks which side each row favours, and knows which direction is better', async () => {
    const { data } = await compare();
    const competitors = data.rows.find((row) => row.label.startsWith('Pesaing'));
    const score = data.rows.find((row) => row.label === 'Skor lokasi');

    // Fewer competitors is better; a higher score is better.
    expect(competitors.better).toBe('lower');
    expect(score.better).toBe('higher');
    expect(competitors.favours).toBe(
      competitors.valueA < competitors.valueB ? 'a' : 'b',
    );
  });

  it('marks no winner when the two are equal', async () => {
    const { data } = await compare();

    for (const row of data.rows) {
      if (row.valueA === row.valueB) expect(row.favours).toBeNull();
    }
  });

  it('gives each column a conclusion drawn from the rows it won', async () => {
    const { data } = await compare();

    expect(data.a.conclusion.length).toBeGreaterThan(30);
    expect(data.b.conclusion.length).toBeGreaterThan(30);
    // Two conclusions that could be swapped without anyone noticing are not
    // conclusions.
    expect(data.a.conclusion).not.toBe(data.b.conclusion);
  });

  it('lists what each side won and lost', async () => {
    const { data } = await compare();

    expect(data.a.wins.concat(data.a.losses).length).toBeGreaterThan(0);
    // A row cannot be won by both.
    for (const label of data.a.wins) expect(data.b.wins).not.toContain(label);
  });

  it('warns when a candidate is too close to an existing branch', async () => {
    const { data } = await compare({ ids: ['bekasi-utara', 'cibubur-junction'] });

    expect(data.a.conclusion).toMatch(/Terlalu dekat/);
    expect(data.a.conclusion).toMatch(/terlihat lebih bagus dari kenyataannya/);
  });

  it('names a high-traffic crowded site as a price play, not a convenience one', async () => {
    const { data } = await compare({ ids: ['kramat-jati', 'duren-sawit'] });

    if (data.a.factors.traffic >= 90 && data.a.factors.competitors < 60) {
      expect(data.a.conclusion).toMatch(/perang harga/);
    }
  });

  it('uses Indonesian decimals in distances', async () => {
    const { data } = await compare();
    const distance = data.rows.find((row) => row.label === 'Cabang sendiri terdekat');

    expect(distance.display.a).not.toMatch(/\d\.\d/);
  });

  it('compares the two named candidates when asked', async () => {
    const { data } = await compare({ ids: ['duren-sawit', 'kramat-jati'] });

    expect(data.a.id).toBe('duren-sawit');
    expect(data.b.id).toBe('kramat-jati');
  });

  it('refuses an unknown candidate and a self-comparison', async () => {
    await expect(compare({ ids: ['tidak-ada', 'kramat-jati'] })).rejects.toMatchObject({
      code: 'CANDIDATE_NOT_FOUND',
    });
    await expect(compare({ ids: ['kramat-jati', 'kramat-jati'] })).rejects.toBeInstanceOf(
      CompareError,
    );
  });

  it('cites the places and branches the comparison rests on', async () => {
    const result = await compare();

    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources.some((s) => s.type === 'place')).toBe(true);
  });

  it('refuses without a tenant id', async () => {
    await expect(compareSites({ places: createSeededPlacesAdapter() })).rejects.toBeInstanceOf(
      TenantScopeError,
    );
  });
});
