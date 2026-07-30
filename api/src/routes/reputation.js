import { ROLES } from '../auth/roles.js';
import { badRequest, notFound } from '../lib/errors.js';

/**
 * Reviews, drafts and themes over HTTP — screens 05, 06 and 07.
 *
 * Every route composes `authenticate → withTenant`, and the ones that change
 * anything add `requireRole(MANAGER)`. The tenant is never read from the body:
 * it comes from the token via `withTenant`, so a crafted payload cannot reach
 * another tenant's rows.
 */
export function reputationRoutes(fastify, { reputation }) {
  const read = { preHandler: [fastify.authenticate, fastify.withTenant] };
  const write = {
    preHandler: [fastify.authenticate, fastify.withTenant, fastify.requireRole(ROLES.MANAGER)],
  };

  fastify.get('/v1/reviews', read, async (request) => {
    const bucket = request.query.bucket ?? 'perlu-tindakan';
    if (!['perlu-tindakan', 'draft-siap', 'terkirim'].includes(bucket)) {
      throw badRequest('BUCKET_INVALID', `Unknown bucket: ${bucket}`);
    }

    return reputation.inbox(request.tenant.id, { bucket });
  });

  fastify.get('/v1/reviews/:reviewId', read, async (request) => {
    const detail = await reputation.reviewDetail(request.tenant.id, request.params.reviewId, {
      locale: request.locale,
    });
    // Same refusal whether the review belongs to another tenant or does not
    // exist, so this cannot be used to probe for ids (AC-6.1).
    if (!detail) throw notFound('Review not found');

    return detail;
  });

  fastify.post('/v1/reviews/:reviewId/reply', write, async (request) => {
    const { principal, tenant } = request;

    const sent = await reputation.approveAndSend(tenant.id, {
      reviewId: request.params.reviewId,
      // The approver is the authenticated caller, never a name in the body.
      approvedBy: principal.email ?? principal.userId,
      role: tenant.role,
      locale: request.locale,
    });

    request.log.info({ event: 'review.reply_sent', reviewId: request.params.reviewId }, 'reply sent');
    return sent;
  });

  fastify.get('/v1/themes', read, async (request) =>
    reputation.themeMatrix(request.tenant.id, { locale: request.locale }),
  );
}
