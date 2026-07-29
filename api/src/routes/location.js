/** The network map — screen 03. */
export function locationRoutes(fastify, { location }) {
  fastify.get(
    '/v1/map',
    { preHandler: [fastify.authenticate, fastify.withTenant] },
    async (request) => location.networkMap(request.tenant.id),
  );

  fastify.get(
    '/v1/scout',
    { preHandler: [fastify.authenticate, fastify.withTenant] },
    async (request) => location.siteScout(request.tenant.id),
  );

  fastify.get(
    '/v1/compare',
    { preHandler: [fastify.authenticate, fastify.withTenant] },
    async (request) => {
      const { a, b } = request.query;
      return location.compare(request.tenant.id, a && b ? [a, b] : null);
    },
  );
}
