import { DEMO_NOW } from '../domain/clock.js';
import { generateReviews } from '../seed/reviews.js';
import { toolResult } from '../lib/toolResult.js';
import { assertTenant, scopeToTenant } from '../lib/tenantScope.js';

/**
 * Business Profile adapter.
 *
 * Q1 in spec.md is still open — the pilot tenant's API access may or may not
 * land before Demo Day. Both answers are served by the same interface, so the
 * swap is one factory call and no caller changes:
 *
 *   listReviews({ tenantId, outletId?, since?, limit? }) → { data, sources[], latencyMs }
 *   reply({ tenantId, reviewId, text, approvedBy })      → { data, sources[], latencyMs }
 *
 * Per plan.md every tool returns `{data, sources[], latencyMs}`, and a tool
 * that cannot cite a source returns `sources: []` so the supervisor refuses to
 * build a claim on it.
 */

export const GBP_TOOL_NAMES = Object.freeze({
  LIST_REVIEWS: 'gbp.listReviews',
  REPLY: 'gbp.reply',
});

export function createSeededGbpAdapter({ now = DEMO_NOW, seed = 'lokus-2026', clock = () => now } = {}) {
  // Generated once: the dataset is a fixture, not a live feed, and reply state
  // has to persist across calls within a process.
  const reviews = generateReviews({ now, seed });
  const byId = new Map(reviews.map((review) => [review.id, review]));

  async function listReviews({ tenantId, outletId = null, since = null, limit = 500 } = {}) {
    const startedAt = Date.now();
    assertTenant(tenantId);

    let rows = scopeToTenant(tenantId, reviews);
    if (outletId) rows = rows.filter((review) => review.outletId === outletId);
    if (since) {
      const cutoff = new Date(since).toISOString();
      rows = rows.filter((review) => review.publishedAt >= cutoff);
    }

    const page = rows.slice(0, limit);

    return toolResult({
      data: { reviews: page.map((review) => ({ ...review })), total: rows.length },
      // Every review is its own citable source: an id the UI can link back to.
      sources: page.map((review) => ({
        type: 'review',
        id: review.id,
        outletId: review.outletId,
        uri: review.sourceUri,
        publishedAt: review.publishedAt,
      })),
      startedAt,
    });
  }

  async function reply({ tenantId, reviewId, text, approvedBy = null } = {}) {
    const startedAt = Date.now();
    assertTenant(tenantId);

    const review = byId.get(reviewId);
    if (!review || review.tenantId !== tenantId) {
      // Same refusal whether the review belongs to another tenant or does not
      // exist, so this cannot be used to probe another tenant's data (AC-6.1).
      throw new GbpError('REVIEW_NOT_FOUND', 'Review tidak ditemukan untuk tenant ini');
    }

    // Constitution II: the human owns the public voice on 1-2 star reviews.
    if (review.rating <= 2 && !approvedBy) {
      throw new GbpError(
        'APPROVAL_REQUIRED',
        'Balasan untuk review bintang 1-2 wajib disetujui manusia sebelum dikirim',
      );
    }

    const sentAt = clock().toISOString();
    review.replyState = 'sent';
    review.replyText = text;
    review.approvedBy = approvedBy;
    review.approvedAt = approvedBy ? sentAt : null;
    review.sentAt = sentAt;

    return toolResult({
      data: { sent: true, sentAt, reviewId },
      sources: [{ type: 'review', id: review.id, outletId: review.outletId, uri: review.sourceUri }],
      startedAt,
    });
  }

  return { isSeeded: true, listReviews, reply, __reviews: reviews };
}

/**
 * The real adapter. Left unimplemented on purpose rather than faked: if the
 * Business Profile credentials are absent the caller must fall back to the
 * seeded adapter explicitly, not silently receive invented reviews.
 */
export function createGoogleGbpAdapter({ accessToken, accountId }) {
  if (!accessToken || !accountId) {
    throw new GbpError(
      'GBP_NOT_CONFIGURED',
      'Business Profile belum dikonfigurasi. Gunakan adapter seeded secara eksplisit.',
    );
  }

  throw new GbpError(
    'GBP_NOT_IMPLEMENTED',
    'Adapter Business Profile menunggu akses API tenant pilot (spec.md Q1).',
  );
}

export class GbpError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GbpError';
    this.code = code;
  }
}
