import { createOutletService, createSeededGbpAdapter, createSeededPlacesAdapter } from '@lokus/core';

/**
 * Branch detail for screen 04.
 *
 * Runs the same service the API exposes over `/v1/outlets`, so the rating,
 * score and rank on this screen are the ones the network map and the review
 * inbox already show for the same branch.
 */
export function createSeededOutletSource({ tenantId = 'nusa-retail' } = {}) {
  const service = createOutletService({
    gbp: createSeededGbpAdapter(),
    places: createSeededPlacesAdapter(),
  });

  return {
    isSeeded: true,
    list: (forTenantId = tenantId) => service.list(forTenantId),
    detail: (forTenantId = tenantId, outletId) => service.detail(forTenantId, outletId),
  };
}
