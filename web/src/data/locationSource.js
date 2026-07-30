import {
  DEFAULT_LOCALE,
  createLocationService,
  createSeededGbpAdapter,
  createSeededPlacesAdapter,
} from '@lokus/core';

/**
 * Network map data for screen 03.
 *
 * Runs the same location service the API exposes, with the seeded Places
 * adapter underneath. Ratings come from the review set so the map and the
 * reputation screens cannot disagree about a branch.
 *
 * `locale` is closed over at construction; `SessionContext` rebuilds this
 * source when the reader's language changes, the same way it rebuilds on a
 * tenant switch.
 */
export function createSeededLocationSource({ tenantId = 'nusa-retail', locale = DEFAULT_LOCALE } = {}) {
  const gbp = createSeededGbpAdapter();
  const service = createLocationService({ places: createSeededPlacesAdapter() });

  let ratingsPromise = null;
  const ratings = () => {
    ratingsPromise ??= gbp.listReviews({ tenantId, limit: 5000 }).then(({ data }) => {
      const byOutlet = new Map();
      for (const review of data.reviews) {
        const bucket = byOutlet.get(review.outletId) ?? { sum: 0, count: 0 };
        bucket.sum += review.rating;
        bucket.count += 1;
        byOutlet.set(review.outletId, bucket);
      }
      return Object.fromEntries(
        [...byOutlet.entries()].map(([id, b]) => [id, Number((b.sum / b.count).toFixed(2))]),
      );
    });
    return ratingsPromise;
  };

  async function networkMap(forTenantId = tenantId) {
    return service.networkMap(forTenantId, { ratingsByOutlet: await ratings(), locale });
  }

  async function siteScout(forTenantId = tenantId) {
    return service.siteScout(forTenantId, { locale });
  }

  async function compareSites(forTenantId = tenantId, ids = null) {
    return service.compare(forTenantId, ids, { locale });
  }

  return { isSeeded: true, networkMap, siteScout, compareSites };
}
