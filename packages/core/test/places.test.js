import { describe, expect, it } from 'vitest';

import {
  CACHE_TTL_MS,
  GRID_DEGREES,
  PlacesError,
  createGooglePlacesAdapter,
  createSeededPlacesAdapter,
  distanceMetres,
  gridCell,
} from '../src/adapters/places.js';
import { DEMO_NOW } from '../src/domain/clock.js';
import { findOutlet } from '../src/domain/outlets.js';
import { isGrounded } from '../src/lib/toolResult.js';

const BEKASI = findOutlet('BKS-02').geo;
const DEPOK = findOutlet('DPK-01').geo;

describe('grid cells', () => {
  it('puts two nearby points in the same cell', () => {
    // ~200 m apart: the same neighbourhood, so the same lookup.
    expect(gridCell(BEKASI)).toBe(gridCell({ lat: BEKASI.lat + 0.0018, lng: BEKASI.lng }));
  });

  it('puts distant points in different cells', () => {
    expect(gridCell(BEKASI)).not.toBe(gridCell(DEPOK));
  });

  it('uses a cell about a kilometre across', () => {
    expect(GRID_DEGREES).toBe(0.01);
  });
});

describe('distance', () => {
  it('measures zero for the same point', () => {
    expect(distanceMetres(BEKASI, BEKASI)).toBe(0);
  });

  it('measures the gap between two outlets in metres', () => {
    const d = distanceMetres(BEKASI, DEPOK);

    // Bekasi Timur to Depok Margonda is roughly 20 km.
    expect(d).toBeGreaterThan(15_000);
    expect(d).toBeLessThan(30_000);
  });

  it('is symmetric', () => {
    expect(distanceMetres(BEKASI, DEPOK)).toBe(distanceMetres(DEPOK, BEKASI));
  });
});

describe('places.nearbyCompetitors', () => {
  it('returns the tool envelope and cites every place', async () => {
    const places = createSeededPlacesAdapter();

    const result = await places.nearbyCompetitors({ geo: BEKASI });

    expect(result).toHaveProperty('latencyMs');
    expect(isGrounded(result)).toBe(true);
    expect(result.sources).toHaveLength(result.data.pois.length);
    expect(result.sources[0]).toMatchObject({ type: 'place', placeId: expect.any(String) });
  });

  it('sorts places nearest first', async () => {
    const { data } = await createSeededPlacesAdapter().nearbyCompetitors({ geo: BEKASI });
    const distances = data.pois.map((poi) => poi.distanceM);

    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it('finds the new competitor near Depok the briefing talks about', async () => {
    const { data } = await createSeededPlacesAdapter().nearbyCompetitors({ geo: DEPOK });
    const recent = data.pois.find((poi) => poi.openedAt);

    expect(recent.openedAt).toBe('2026-06-28');
    expect(recent.distanceM).toBe(400);
    expect(data.newSinceCount).toBe(1);
  });

  it('reports no recent opening where there is none', async () => {
    const { data } = await createSeededPlacesAdapter().nearbyCompetitors({ geo: BEKASI });

    expect(data.newSinceCount).toBe(0);
  });

  it('refuses without a coordinate rather than guessing one', async () => {
    const places = createSeededPlacesAdapter();

    await expect(places.nearbyCompetitors({})).rejects.toBeInstanceOf(PlacesError);
    await expect(places.nearbyCompetitors({ geo: { lat: 'x', lng: 1 } })).rejects.toMatchObject({
      code: 'GEO_REQUIRED',
    });
  });

  it('is deterministic — the same cell gives the same places', async () => {
    const first = await createSeededPlacesAdapter().nearbyCompetitors({ geo: BEKASI });
    const second = await createSeededPlacesAdapter().nearbyCompetitors({ geo: BEKASI });

    expect(first.data.pois).toEqual(second.data.pois);
  });
});

describe('the 7-day grid cache', () => {
  it('serves a second call in the same cell from cache', async () => {
    const places = createSeededPlacesAdapter();

    const first = await places.nearbyCompetitors({ geo: BEKASI });
    const second = await places.nearbyCompetitors({ geo: BEKASI });

    expect(first.data.cached).toBe(false);
    expect(second.data.cached).toBe(true);
    expect(places.cacheStats()).toMatchObject({ calls: 2, hits: 1, misses: 1 });
  });

  it('serves a nearby coordinate from the same cell — the point of caching by cell', async () => {
    const places = createSeededPlacesAdapter();

    await places.nearbyCompetitors({ geo: BEKASI });
    // A different coordinate, same neighbourhood: Places is billed per call.
    const near = await places.nearbyCompetitors({ geo: { lat: BEKASI.lat + 0.0015, lng: BEKASI.lng } });

    expect(near.data.cached).toBe(true);
    expect(places.cacheStats().misses).toBe(1);
  });

  it('does not share a cache entry between different radii', async () => {
    const places = createSeededPlacesAdapter();

    await places.nearbyCompetitors({ geo: BEKASI, radiusM: 1000 });
    const wider = await places.nearbyCompetitors({ geo: BEKASI, radiusM: 2000 });

    expect(wider.data.cached).toBe(false);
  });

  it('expires after seven days', async () => {
    let now = DEMO_NOW;
    const places = createSeededPlacesAdapter({ now: () => now });

    await places.nearbyCompetitors({ geo: BEKASI });
    now = new Date(DEMO_NOW.getTime() + CACHE_TTL_MS + 1000);
    const after = await places.nearbyCompetitors({ geo: BEKASI });

    expect(after.data.cached).toBe(false);
    expect(CACHE_TTL_MS).toBe(7 * 24 * 3600 * 1000);
  });

  it('still serves just before the seven days are up', async () => {
    let now = DEMO_NOW;
    const places = createSeededPlacesAdapter({ now: () => now });

    await places.nearbyCompetitors({ geo: BEKASI });
    now = new Date(DEMO_NOW.getTime() + CACHE_TTL_MS - 1000);

    expect((await places.nearbyCompetitors({ geo: BEKASI })).data.cached).toBe(true);
  });
});

describe('the real Places adapter', () => {
  it('refuses to be constructed without a key rather than inventing competitors', () => {
    expect(() => createGooglePlacesAdapter({})).toThrow(PlacesError);
    expect(() => createGooglePlacesAdapter({})).toThrow(/belum dikonfigurasi/);
  });

  it('is explicit that it awaits pilot quota', () => {
    expect(() => createGooglePlacesAdapter({ apiKey: 'x' })).toThrow(/Q1/);
  });
});
