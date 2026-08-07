import { ROLES } from '../auth/roles.js';
import { notFound } from '../lib/errors.js';

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
      locale: request.locale,
    });
  });

  fastify.post('/v1/knowledge/documents', write, async (request) =>
    knowledge.ingest(request.tenant.id, request.body ?? {}),
  );

  // The chunks indexed from one document (AC-10.8). The role comes from the
  // verified token, never from the query — a restricted document is refused by
  // the service, which throws `ROLE_FORBIDDEN` and lands on 422 with that code.
  fastify.get('/v1/knowledge/documents/:docId', read, async (request) => {
    const document = await knowledge.document(request.tenant.id, request.params.docId, {
      role: request.tenant.role,
    });
    // One refusal for "another tenant's document" and "no such document", so
    // this cannot be used to enumerate document ids (AC-6.1).
    if (!document) throw notFound('Document not found');

    return document;
  });
}
