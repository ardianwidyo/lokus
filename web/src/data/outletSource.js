import { DEFAULT_LOCALE, createOutletService, createSeededGbpAdapter, createSeededPlacesAdapter } from '@lokus/core';

/**
 * Branch detail for screen 04.
 *
 * Runs the same service the API exposes over `/v1/outlets`, so the rating,
 * score and rank on this screen are the ones the network map and the review
 * inbox already show for the same branch.
 *
 * `locale` is closed over at construction; `SessionContext` rebuilds this
 * source when the reader's language changes, the same way it rebuilds on a
 * tenant switch.
 */
export function createSeededOutletSource({
  tenantId = 'nusa-retail',
  locale = DEFAULT_LOCALE,
  // The workspace's adapter, so the rating on screen 04 counts a review added
  // on screen 05 instead of describing a different set of rows.
  gbp = null,
} = {}) {
  const service = createOutletService({
    gbp: gbp ?? createSeededGbpAdapter(),
    places: createSeededPlacesAdapter(),
  });

  return {
    isSeeded: true,
    list: (forTenantId = tenantId) => service.list(forTenantId),
    detail: (forTenantId = tenantId, outletId) => service.detail(forTenantId, outletId, { locale }),
  };
}
