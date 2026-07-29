import { ROLES } from '../auth/roles.js';

/** Screens 11 and 12. */
export function knowledgeRoutes(fastify, { knowledge }) {
  const read = { preHandler: [fastify.authenticate, fastify.withTenant] };
  const write = {
    preHandler: [fastify.authenticate, fastify.withTenant, fastify.requireRole(ROLES.MANAGER)],
  };

  fastify.get('/v1/knowledge', read, async (request) => knowledge.overview(request.tenant.id));

  fastify.post('/v1/knowledge/ask', read, async (request) => {
    const { principal, tenant } = request;
    return knowledge.ask(tenant.id, String(request.body?.question ?? ''), {
      askedBy: principal.name ?? principal.email ?? principal.userId,
    });
  });

  fastify.post('/v1/knowledge/documents', write, async (request) =>
    knowledge.ingest(request.tenant.id, request.body ?? {}),
  );
}
