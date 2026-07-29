import { DEMO_NOW } from '../domain/clock.js';
import { OUTLETS } from '../domain/outlets.js';
import { createRng } from '../seed/rng.js';
import { toolResult } from '../lib/toolResult.js';

/**
 * Places adapter — `places.nearbyCompetitors`.
 *
 * Same two-implementation shape as the Business Profile adapter: a seeded one
 * now, the Google one when a key exists, and callers change nothing.
 *
 * Responses are cached per grid cell for 7 days (plan.md, "Risks"). Places is
 * billed per call and rate limited, and two outlets 300 m apart ask nearly the
 * same question — caching by cell rather than by exact coordinate is what makes
 * a whole-network scan affordable.
 */

/** ~1.1 km at the equator. Small enough to be meaningful, large enough to hit. */
export const GRID_DEGREES = 0.01;

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Categories that compete with a minimarket for the same basket. */
export const COMPETING_CATEGORIES = Object.freeze([
  'minimarket',
  'convenience_store',
  'supermarket',
]);

export class PlacesError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PlacesError';
    this.code = code;
  }
}

/** The cell a coordinate falls in. Two points in one cell share one lookup. */
export function gridCell({ lat, lng }, size = GRID_DEGREES) {
  return `${Math.floor(lat / size)}:${Math.floor(lng / size)}`;
}

/** Metres between two coordinates. Haversine — good to a few metres at this scale. */
export function distanceMetres(a, b) {
  const R = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/**
 * How many competing POIs sit near each outlet. Seeded, but it is the *input*
 * to the location score rather than the score itself — the competitor factor
 * is derived from this count, so changing the map changes the score.
 */
const COMPETITOR_COUNTS = Object.freeze({
  'BKS-02': 5,
  'CKR-01': 4,
  'DPK-01': 7,
  'SRP-03': 3,
  'BGR-01': 2,
  'TGR-01': 3,
});

/** Depok's newest competitor is the one the briefing talks about. */
const RECENT_OPENINGS = Object.freeze({
  'DPK-01': { name: 'Mitra Mart Margonda', openedAt: '2026-06-28', distanceM: 400 },
});

const POI_NAMES = Object.freeze([
  'Sinar Mart', 'Berkah Minimart', 'Toko Sejahtera', 'Mart 88', 'Cahaya Swalayan',
  'Rukun Mart', 'Sumber Rejeki', 'Amanah Minimarket', 'Jaya Mart', 'Harapan Swalayan',
]);

export function createSeededPlacesAdapter({ now = () => DEMO_NOW, seed = 'lokus-places' } = {}) {
  const cache = new Map();
  const stats = { calls: 0, hits: 0, misses: 0 };

  function generate(geo, radiusM) {
    // Anchored to the nearest outlet so the same place is returned for the
    // same neighbourhood however the caller phrased the coordinate.
    const anchor = OUTLETS.map((outlet) => ({ outlet, d: distanceMetres(geo, outlet.geo) })).sort(
      (a, b) => a.d - b.d,
    )[0];

    const outletId = anchor.outlet.outletId;
    const count = COMPETITOR_COUNTS[outletId] ?? 3;
    const rng = createRng(`${seed}:${outletId}`);
    const recent = RECENT_OPENINGS[outletId] ?? null;

    const pois = Array.from({ length: count }, (_, index) => {
      const distanceM = recent && index === 0 ? recent.distanceM : rng.int(180, radiusM);
      const bearing = rng.next() * 2 * Math.PI;

      return {
        placeId: `poi-${outletId}-${index + 1}`,
        name: recent && index === 0 ? recent.name : `${rng.pick(POI_NAMES)} ${outletId.slice(0, 3)}`,
        category: rng.pick(COMPETING_CATEGORIES),
        distanceM,
        openedAt: recent && index === 0 ? recent.openedAt : null,
        geo: offset(anchor.outlet.geo, distanceM, bearing),
      };
    }).sort((a, b) => a.distanceM - b.distanceM);

    return { outletId, pois };
  }

  async function nearbyCompetitors({ geo, radiusM = 1000, newSinceDays = 60 } = {}) {
    const startedAt = Date.now();

    if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
      throw new PlacesError('GEO_REQUIRED', 'Koordinat wajib diisi untuk pemindaian Places');
    }

    const key = `${gridCell(geo)}:${radiusM}`;
    const at = now().getTime();
    stats.calls += 1;

    const cached = cache.get(key);
    const fresh = cached && at - cached.storedAt < CACHE_TTL_MS;
    if (fresh) stats.hits += 1;
    else stats.misses += 1;

    const { outletId, pois } = fresh ? cached.value : generate(geo, radiusM);
    if (!fresh) cache.set(key, { storedAt: at, value: { outletId, pois } });

    const cutoff = at - newSinceDays * 24 * 3600 * 1000;
    const newSince = pois.filter((poi) => poi.openedAt && new Date(poi.openedAt).getTime() >= cutoff);

    return toolResult({
      data: {
        pois: pois.map((poi) => ({ ...poi })),
        total: pois.length,
        newSinceCount: newSince.length,
        radiusM,
        gridCell: gridCell(geo),
        cached: Boolean(fresh),
      },
      // Every POI is a citable source: a place id the UI can link back to.
      sources: pois.map((poi) => ({
        type: 'place',
        placeId: poi.placeId,
        name: poi.name,
        distanceM: poi.distanceM,
      })),
      startedAt,
    });
  }

  return { isSeeded: true, nearbyCompetitors, cacheStats: () => ({ ...stats, size: cache.size }) };
}

/**
 * The real adapter. Unimplemented on purpose rather than faked: without a key
 * the caller must choose the seeded adapter explicitly instead of silently
 * receiving invented competitors.
 */
export function createGooglePlacesAdapter({ apiKey } = {}) {
  if (!apiKey) {
    throw new PlacesError(
      'PLACES_NOT_CONFIGURED',
      'Places API belum dikonfigurasi. Gunakan adapter seeded secara eksplisit.',
    );
  }

  throw new PlacesError(
    'PLACES_NOT_IMPLEMENTED',
    'Adapter Places menunggu kunci API dan kuota tenant pilot (spec.md Q1).',
  );
}

/** Moves a coordinate `metres` along `bearing`, for placing a POI on the map. */
function offset({ lat, lng }, metres, bearing) {
  const dLat = (metres * Math.cos(bearing)) / 111_320;
  const dLng = (metres * Math.sin(bearing)) / (111_320 * Math.cos((lat * Math.PI) / 180));

  return { lat: Number((lat + dLat).toFixed(6)), lng: Number((lng + dLng).toFixed(6)) };
}
