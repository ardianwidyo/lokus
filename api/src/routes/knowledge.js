import { ROLES } from '../auth/roles.js';
import { attachmentDisposition } from '../lib/contentDisposition.js';
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

  /**
   * The file itself (AC-10.11).
   *
   * The role comes off the verified token, as it does for the chunks, and the
   * same service decides both — a restricted document refuses its file with the
   * `ROLE_FORBIDDEN` the console already renders as needs-permission. A
   * document LOKUS holds no file for answers `FILE_NOT_HELD` rather than an
   * empty body, because a zero-byte download reads as a broken server.
   */
  fastify.get('/v1/knowledge/documents/:docId/file', read, async (request, reply) => {
    const file = await knowledge.documentFile(request.tenant.id, request.params.docId, {
      role: request.tenant.role,
    });
    if (!file) throw notFound('Document not found');

    // Production: the object lives in Cloud Storage and is handed over by a
    // short-lived signed URL. Proxying it would put every megabyte of every
    // tenant's corpus through this process's memory for no benefit.
    if (file.url) return reply.redirect(302, file.url);

    const body = file.bytes ? Buffer.from(file.bytes) : Buffer.from(file.text, 'utf8');

    return reply
      .header('content-type', file.mimeType)
      .header('content-disposition', attachmentDisposition(file.filename))
      .header('content-length', String(body.length))
      // A tenant's own SOP. No shared cache may hold a copy of it.
      .header('cache-control', 'private, no-store')
      // Which of the three AC-10.11 outcomes this is. The console says so to
      // the reader, and it can only say it if the response carries it.
      .header('x-lokus-file-origin', file.origin)
      .send(body);
  });
}
