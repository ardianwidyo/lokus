import { replyCoverage } from '../analytics/replyCoverage.js';
import { flagSystemicThemes, systemicFinding } from '../analytics/systemic.js';
import { themeCluster } from '../analytics/themeCluster.js';
import { relativeLabel } from '../domain/clock.js';
import { listingFor } from '../domain/listingLevel.js';
import { findOutlet } from '../domain/outlets.js';
import { themeLabel } from '../domain/themes.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { assertTenant } from '../lib/tenantScope.js';
import {
  approveDraft,
  createMemoryApprovalStore,
  replyQueueSummary,
  saveDraft,
  sendReply,
} from '../reputation/approvals.js';
import { draftReply } from '../reputation/draftReply.js';
import { guardrailCheck } from '../reputation/guardrails.js';

/**
 * The composed reputation operations screens 05, 06 and 07 need.
 *
 * This lives in core rather than in either caller so the API and the seeded
 * browser source run *the same* composition. Two copies of "list the inbox,
 * draft a reply, run the guardrails" would drift, and the one that drifted
 * would be whichever the demo did not use.
 *
 * Every method takes the tenant id first and passes it down; nothing here can
 * be called without one.
 */
export function createReputationService({ gbp, approvalStore = null, gemini = null } = {}) {
  const store = approvalStore ?? createMemoryApprovalStore();

  // Reviews and listings arrive in one response and are cached together, so a
  // row and the permission covering it can never be a cycle apart (US-9).
  const readByTenant = new Map();
  async function read(tenantId) {
    if (!readByTenant.has(tenantId)) {
      const { data } = await gbp.listReviews({ tenantId, limit: 5000 });
      readByTenant.set(tenantId, { reviews: data.reviews, listings: data.listings ?? [] });
    }
    return readByTenant.get(tenantId);
  }

  async function allReviews(tenantId) {
    return (await read(tenantId)).reviews;
  }

  const draftCache = new Map();
  // Keyed by locale as well as review: the reply body is Indonesian either way,
  // but the tone label and the refusal reason shown beside it are not.
  async function draftFor(tenantId, review, locale = DEFAULT_LOCALE) {
    const key = `${tenantId}:${review.id}:${locale}`;
    if (!draftCache.has(key)) {
      const result = await draftReply({ tenantId, review, gemini, locale });
      draftCache.set(key, result.data);
    }
    return draftCache.get(key);
  }

  async function inbox(tenantId, { bucket = 'perlu-tindakan' } = {}) {
    assertTenant(tenantId);
    const { reviews, listings } = await read(tenantId);
    const summary = await replyQueueSummary({ tenantId, reviews, store, listings });
    const repliable = (review) => listingFor(listings, review.outletId).canReply;

    const buckets = {
      'perlu-tindakan': summary.needsActionReviews,
      'draft-siap': reviews.filter((r) => r.rating >= 3 && r.replyState === 'draft' && repliable(r)),
      terkirim: reviews.filter((r) => r.replyState === 'sent'),
      // Not a workflow stage like the other three but an origin, so a review
      // legitimately appears here *and* in whichever stage it reached. This is
      // the answer to "what have I handed the system", which the stages cannot
      // give (AC-10.10). Over HTTP it is always empty: nothing can be added
      // through the API, and saying zero is truthful rather than misleading.
      ditambahkan: reviews.filter((r) => r.addedInSession),
    };

    return {
      counts: {
        'perlu-tindakan': summary.needsAction,
        'draft-siap': buckets['draft-siap'].length,
        terkirim: summary.sent,
        ditambahkan: buckets.ditambahkan.length,
      },
      // Named apart from the counts: it is not a fourth bucket, it is how much
      // of the first one is waiting on a connection rather than on a reply.
      needsConnection: summary.needsConnection,
      rows: (buckets[bucket] ?? []).map((review) => toRow(review, listings)),
    };
  }

  async function reviewDetail(tenantId, reviewId, { locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);
    const { reviews, listings } = await read(tenantId);
    const review = reviews.find((row) => row.id === reviewId);
    if (!review) return null;

    const draft = await draftFor(tenantId, review, locale);
    const guardrail = draft.drafted
      ? guardrailCheck({ draftText: draft.text, citations: draft.citations, locale }).data
      : null;
    const persisted = await store.get(tenantId, reviewId);

    return {
      review: toRow(review, listings),
      draft,
      guardrail,
      // The screen decides what to offer from this, so it travels with the
      // draft rather than being looked up separately (AC-9.1).
      listing: listingFor(listings, review.outletId),
      state: persisted?.state ?? review.replyState,
      approvedBy: persisted?.approvedBy ?? null,
    };
  }

  async function approveAndSend(tenantId, { reviewId, approvedBy, role, locale = DEFAULT_LOCALE }) {
    assertTenant(tenantId);
    const { reviews, listings } = await read(tenantId);
    const review = reviews.find((row) => row.id === reviewId);
    if (!review) return null;

    const draft = await draftFor(tenantId, review, locale);

    if (!(await store.get(tenantId, reviewId))) {
      await saveDraft({
        tenantId,
        review,
        draft,
        store,
        listing: listingFor(listings, review.outletId),
      });
    }
    // Constitution II: 1-2 stars need a named human. The role check inside
    // approveDraft refuses a viewer even if a route somehow let one through.
    if (review.rating <= 2) {
      await approveDraft({ tenantId, reviewId, approvedBy, role, store });
    }

    const sent = await sendReply({ tenantId, reviewId, store, gbp, actor: approvedBy });
    return sent.data;
  }

  async function themeMatrix(tenantId, { locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);
    const reviews = await allReviews(tenantId);
    const { data, sources } = await themeCluster({ tenantId, reviews });
    const themes = flagSystemicThemes(data.themes, { locale });

    return {
      themes: themes.map((theme) => ({ ...theme, label: themeLabel(theme.theme, locale) })),
      finding: systemicFinding(data.themes, { locale }),
      weeks: data.weeks,
      reviewsConsidered: data.reviewsConsidered,
      sourceCount: sources.length,
      sentimentByWeek: sentimentByWeek(reviews, data.weeks),
      bestPractice: bestPractice(themes, locale),
    };
  }

  /** The listing level of every outlet, for the panels that report coverage. */
  async function listings(tenantId) {
    assertTenant(tenantId);
    const { reviews, listings: rows } = await read(tenantId);
    return { listings: rows, coverage: replyCoverage(reviews, rows) };
  }

  /**
   * A review typed into the console during a demo, not read from Google.
   *
   * The adapter does the refusing — tenant, outlet, rating, empty text, and the
   * listing level that decides whether an outlet can carry reviews at all — and
   * this re-raises rather than translating, so adding to an outlet LOKUS may
   * not reply to gets the same explanation the rest of the console gives for it
   * (AC-10.5).
   *
   * Both caches are dropped afterwards. The read cache would otherwise hide the
   * new row until the process restarted, and the draft cache is keyed per
   * review so it only needs clearing if an id is ever reused — which it is not,
   * but a stale draft is a worse bug than a redundant clear.
   */
  async function addReview(tenantId, input) {
    assertTenant(tenantId);
    const { data } = await gbp.addReview({ tenantId, ...input });
    readByTenant.delete(tenantId);
    draftCache.clear();
    return data.review;
  }

  return { inbox, reviewDetail, approveAndSend, themeMatrix, listings, addReview, store };
}

function toRow(review, listings = []) {
  const listing = listingFor(listings, review.outletId);

  return {
    ...review,
    outletName: findOutlet(review.outletId)?.name ?? review.outletId,
    relative: relativeLabel(review.publishedAt),
    listingLevel: listing.level,
    canReply: listing.canReply,
  };
}

/** Share of reviews per week that are negative — the trend card on screen 07. */
function sentimentByWeek(reviews, weeks) {
  const totals = Array.from({ length: weeks }, () => ({ negative: 0, total: 0 }));
  const now = Date.now();
  const weekMs = 7 * 24 * 3600 * 1000;

  for (const review of reviews) {
    const age = Math.floor((now - new Date(review.publishedAt).getTime()) / weekMs);
    const index = weeks - 1 - age;
    if (index < 0 || index >= weeks) continue;

    totals[index].total += 1;
    if (review.rating <= 2) totals[index].negative += 1;
  }

  return totals.map(({ negative, total }) => (total === 0 ? 0 : Number((negative / total).toFixed(3))));
}

/** The branch coping best with the leading theme — something to copy, not fix. */
function bestPractice(themes, locale = DEFAULT_LOCALE) {
  const leading = themes[0];
  if (!leading) return null;

  const entries = Object.entries(leading.byOutlet ?? {}).sort((a, b) => a[1] - b[1]);
  const [outletId, count] = entries[0] ?? [];
  if (!outletId) return null;

  return {
    outletId,
    outletName: findOutlet(outletId)?.name ?? outletId,
    theme: leading.theme,
    label: themeLabel(leading.theme, locale),
    count,
  };
}
