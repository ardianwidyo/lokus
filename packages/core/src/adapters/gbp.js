import { DEMO_NOW } from '../domain/clock.js';
import { LISTING_LEVELS, listingFor } from '../domain/listingLevel.js';
import { findOutlet } from '../domain/outlets.js';
import { seedListings } from '../seed/listings.js';
import { buildReview, generateReviews } from '../seed/reviews.js';
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
 * `listReviews` also returns `data.listings`: one record per outlet saying which
 * of the two Google APIs answered for it and therefore what may be done with it
 * (spec US-9). The reviews and the permission travel together on purpose — a
 * caller that has the rows has, in the same response, the reason it may or may
 * not answer them.
 *
 * Per plan.md every tool returns `{data, sources[], latencyMs}`, and a tool
 * that cannot cite a source returns `sources: []` so the supervisor refuses to
 * build a claim on it.
 */

export const GBP_TOOL_NAMES = Object.freeze({
  LIST_REVIEWS: 'gbp.listReviews',
  REPLY: 'gbp.reply',
});

/**
 * The generated rows, cached per (instant, seed).
 *
 * The dataset is a pure function of those two inputs, so regenerating it for
 * every adapter is waste — and it was measurable waste: the browser test suite
 * builds a dozen sources per run and started timing out on slower machines.
 *
 * Each adapter still gets its own copies, because `reply()` mutates reply state
 * and one adapter's send must never appear in another's data.
 */
const GENERATED = new Map();

function generatedRows(now, seed) {
  const key = `${now.getTime()}:${seed}`;
  if (!GENERATED.has(key)) GENERATED.set(key, generateReviews({ now, seed }));
  return GENERATED.get(key);
}

export function createSeededGbpAdapter({ now = DEMO_NOW, seed = 'lokus-2026', clock = () => now } = {}) {
  // Copied, not shared: reply state is per-adapter.
  const reviews = generatedRows(now, seed).map((review) => ({ ...review }));
  const byId = new Map(reviews.map((review) => [review.id, review]));

  // Ids for rows added at runtime. Per adapter, so two adapters cannot mint the
  // same id and a reset genuinely starts over.
  let demoCounter = 0;

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

    // Probed on every call rather than cached: a level is a claim about what
    // the credentials return *now*, and a stored one would keep reporting a
    // grant that has since been revoked (AC-9.2).
    const listings = seedListings({ tenantId, now: clock() });

    return toolResult({
      data: {
        reviews: page.map((review) => ({ ...review })),
        total: rows.length,
        // Every outlet, not only the ones that produced reviews — an outlet with
        // no listing has nothing to report except that fact, and that fact is
        // exactly what the console needs (AC-9.1).
        listings,
      },
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

    // AC-9.4, and the last line of defence for it. Publishing a reply needs the
    // v4 write, which needs a listing this account manages — so an unclaimed or
    // absent listing is refused here even if every layer above it let the call
    // through. The refusal names the level, because "connect the account" and
    // "this branch is not on Maps" are different problems for the reader.
    const listing = listingFor(seedListings({ tenantId, now: clock() }), review.outletId);
    if (!listing.canReply) {
      throw new GbpError(
        listing.unsendableReason,
        'Balasan hanya bisa dikirim untuk lokasi yang dikelola akun ini',
      );
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

  /**
   * Adds a review the seed did not contain (AC-10.4).
   *
   * This is the demo's only way to hand the agents something they have never
   * seen, and it is the whole point: a theme rediscovered from text written in
   * the room is evidence the clusterer reads, where the seeded matrix is only
   * evidence it was configured.
   *
   * It goes in through the same gates a Google row does rather than beside
   * them (AC-10.5). Tenant scope is asserted, the outlet must belong to that
   * tenant, and the listing level decides the reply state exactly as it does in
   * `buildReview` — so a review added for an L1 outlet is unrepliable here for
   * the same reason it would be unrepliable if Google had sent it.
   *
   * `source: 'demo'` and the absent `sourceUri` are load-bearing, not
   * cosmetic: nothing downstream may cite this row as having come from Google
   * (AC-10.6), and a citation with no URI is one a reader cannot mistake for a
   * live listing.
   */
  async function addReview({ tenantId, outletId, rating, author, text, publishedAt = null } = {}) {
    const startedAt = Date.now();
    assertTenant(tenantId);

    const outlet = findOutlet(outletId);
    if (!outlet || outlet.tenantId !== tenantId) {
      // Same refusal for "belongs to another tenant" and "does not exist", for
      // the same reason `reply` gives one refusal for both (AC-6.1).
      throw new GbpError('OUTLET_NOT_FOUND', 'Cabang tidak ditemukan untuk tenant ini');
    }

    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw new GbpError('RATING_INVALID', 'Rating harus bilangan bulat 1 sampai 5');
    }
    if (!String(text ?? '').trim()) {
      throw new GbpError('TEXT_REQUIRED', 'Review tanpa teks tidak bisa dianalisis');
    }

    const listing = listingFor(seedListings({ tenantId, now: clock() }), outletId);
    if (listing.level === LISTING_LEVELS.ABSENT) {
      // L0 is not a permission problem and no click fixes it: an outlet with no
      // listing on Maps is an outlet no review could have been left on (US-9).
      throw new GbpError(
        'LISTING_ABSENT',
        'Cabang ini belum punya listing di Google Maps, jadi tidak bisa menerima review',
      );
    }

    const at = publishedAt ? new Date(publishedAt) : clock();
    const review = {
      ...buildReview({
        id: `rev-${outletId}-demo-${++demoCounter}`,
        tenantId,
        outletId,
        rating: stars,
        author: String(author ?? '').trim() || 'Tamu',
        text: String(text).trim(),
        publishedAt: at,
        now: clock(),
        level: listing.level,
      }),
      source: 'demo',
      sourceUri: null,
      addedInSession: true,
    };

    reviews.unshift(review);
    byId.set(review.id, review);

    return toolResult({
      data: { review: { ...review }, total: scopeToTenant(tenantId, reviews).length },
      sources: [{ type: 'review', id: review.id, outletId, uri: null, publishedAt: review.publishedAt }],
      startedAt,
    });
  }

  return { isSeeded: true, listReviews, reply, addReview, __reviews: reviews };
}

/**
 * The real adapter. Left unimplemented on purpose rather than faked: if the
 * Business Profile credentials are absent the caller must fall back to the
 * seeded adapter explicitly, not silently receive invented reviews.
 *
 * When it is written it must derive each outlet's level with
 * `deriveListingLevel` over its own two responses — the v4 location lookup and
 * the Places match — rather than reading a configured value. That is what keeps
 * AC-9.2 true of the real path and not only of the seeded one.
 */
export function createGoogleGbpAdapter({ accessToken, accountId }) {
  if (!accessToken || !accountId) {
    throw new GbpError(
      'GBP_NOT_CONFIGURED',
      'Business Profile belum diatur. Pakai adapter data contoh secara eksplisit.',
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
