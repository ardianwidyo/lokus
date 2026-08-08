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
    if (!['perlu-tindakan', 'draft-siap', 'terkirim', 'ditambahkan'].includes(bucket)) {
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

  /**
   * A review typed into the console during a demo (US-10, AC-10.4).
   *
   * `/demo` is in the path rather than a flag in the body, because what this
   * creates is not a Google review and the route should not be mistakable for
   * one. The row it produces carries a demo tag everywhere it appears, so a
   * console running against this API still cannot present typed text as
   * something Google returned (AC-10.6).
   *
   * The tenant comes from the token, never from the body — the same rule every
   * other route here follows.
   */
  fastify.post('/v1/reviews/demo', write, async (request) => {
    const body = request.body ?? {};

    const review = await reputation.addReview(request.tenant.id, {
      outletId: body.outletId,
      rating: body.rating,
      author: body.author,
      text: body.text,
    });

    request.log.info(
      { event: 'review.demo_added', reviewId: review.id, outletId: review.outletId },
      'demo review added',
    );
    return { review };
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
