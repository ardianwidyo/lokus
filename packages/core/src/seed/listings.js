import { DEMO_NOW } from '../domain/clock.js';
import { OUTLETS } from '../domain/outlets.js';
import { listingRecord } from '../domain/listingLevel.js';

/**
 * What Google returns for each outlet, in the seeded world.
 *
 * Note what this file does *not* contain: a level. It describes the two API
 * responses — the Business Profile location name, if the tenant's grant covers
 * the outlet, and the Places id, if the place is on Maps at all — and
 * `deriveListingLevel` turns those into a level, exactly as the Google adapter
 * will over real responses (AC-9.2).
 *
 * The distinction is the point. Writing `level: 'managed'` here would make the
 * level a decision someone typed, and the console would keep reporting it after
 * the grant was revoked. Writing what came back makes the level an observation,
 * and an observation can go stale honestly.
 */
export const SEED_LISTING_PROBES = Object.freeze({
  'BKS-02': { managedLocation: 'locations/10293847561', placesMatch: 'ChIJseedBKS02' },
  'CKR-01': { managedLocation: 'locations/10293847562', placesMatch: 'ChIJseedCKR01' },
  'DPK-01': { managedLocation: 'locations/10293847563', placesMatch: 'ChIJseedDPK01' },
  'SRP-03': { managedLocation: 'locations/10293847564', placesMatch: 'ChIJseedSRP03' },
  'BGR-01': { managedLocation: 'locations/10293847565', placesMatch: 'ChIJseedBGR01' },
  'TGR-01': { managedLocation: 'locations/10293847566', placesMatch: 'ChIJseedTGR01' },

  // Bought from a franchisee. The place is on Maps and the reviews are public,
  // but the listing is still verified against the previous owner's Google
  // account, so the v4 call returns nothing for it.
  'KRW-01': { managedLocation: null, placesMatch: 'ChIJseedKRW01' },

  // Opened 2026-07-15 and never added to Maps. Both calls come back empty, and
  // there is nothing a permission grant would fix.
  'BSD-02': { managedLocation: null, placesMatch: null },
});

/**
 * The probe results as listing records, as of `checkedAt`.
 *
 * The seeded adapter calls this on every `listReviews`, rather than caching it,
 * because a level is an answer about now — see the note in `listingLevel.js`.
 */
export function seedListings({ tenantId, now = DEMO_NOW } = {}) {
  const checkedAt = now.toISOString();

  return OUTLETS.filter((outlet) => !tenantId || outlet.tenantId === tenantId).map((outlet) =>
    listingRecord({
      outletId: outlet.outletId,
      probe: SEED_LISTING_PROBES[outlet.outletId] ?? {},
      checkedAt,
    }),
  );
}
