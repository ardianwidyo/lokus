import { HttpError } from '../lib/errors.js';

/** One branch, joined across the agents — screen 04. */
export function outletRoutes(fastify, { outlets }) {
  const read = { preHandler: [fastify.authenticate, fastify.withTenant] };

  fastify.get('/v1/outlets', read, async (request) => ({
    outlets: await outlets.list(request.tenant.id),
  }));

  fastify.get('/v1/outlets/:outletId', read, async (request) => {
    const detail = await outlets.detail(request.tenant.id, request.params.outletId, {
      locale: request.locale,
    });

    // A branch in another tenant returns the same 404 as one that does not
    // exist, so the status code cannot be used to enumerate the estate.
    if (!detail) {
      throw new HttpError(404, 'OUTLET_NOT_FOUND', 'Cabang tidak ditemukan untuk tenant ini.');
    }
    return detail;
  });
}
