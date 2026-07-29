/** The network map — screen 03. */
export function locationRoutes(fastify, { location }) {
  fastify.get(
    '/v1/map',
    { preHandler: [fastify.authenticate, fastify.withTenant] },
    async (request) => location.networkMap(request.tenant.id),
  );
}
