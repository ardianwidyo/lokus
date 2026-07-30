import {
  DEFAULT_LOCALE,
  approveDraft,
  createMemoryApprovalStore,
  createSeededGbpAdapter,
  draftReply,
  flagSystemicThemes,
  guardrailCheck,
  relativeLabel,
  replyQueueSummary,
  saveDraft,
  sendReply,
  systemicFinding,
  themeCluster,
  themeLabel,
} from '@lokus/core';

/**
 * Reputation data for screens 05, 06 and 07.
 *
 * Same two-implementation pattern as the session source: this seeded one runs
 * the real domain logic from @lokus/core in the browser, so the console is
 * fully clickable with no API and no cloud project. The HTTP implementation
 * calls the Fastify API, which wraps the identical functions.
 *
 * Nothing here computes a figure of its own — every count, theme and citation
 * comes back from core, so a number on screen traces to the reviews behind it.
 *
 * `locale` is closed over at construction rather than passed per call, because
 * `SessionContext` already rebuilds this source when the reader's language
 * changes (the same way it rebuilds on a tenant switch) — see the comment
 * there. That keeps every call site in the screens unchanged.
 */
export function createSeededReputationSource({ tenantId = 'nusa-retail', locale = DEFAULT_LOCALE } = {}) {
  const gbp = createSeededGbpAdapter();
  const store = createMemoryApprovalStore();

  let reviewsPromise = null;
  const loadReviews = () => {
    reviewsPromise ??= gbp
      .listReviews({ tenantId, limit: 5000 })
      .then((result) => result.data.reviews);
    return reviewsPromise;
  };

  /** Drafts are generated lazily and cached, so opening a review is instant. */
  const draftCache = new Map();
  async function draftFor(review) {
    if (!draftCache.has(review.id)) {
      const result = await draftReply({ tenantId, review, locale });
      draftCache.set(review.id, result.data);
    }
    return draftCache.get(review.id);
  }

  async function inbox({ bucket = 'perlu-tindakan' } = {}) {
    const reviews = await loadReviews();
    const summary = await replyQueueSummary({ tenantId, reviews, store });

    const buckets = {
      'perlu-tindakan': summary.needsActionReviews,
      'draft-siap': reviews.filter((review) => review.rating >= 3 && review.replyState === 'draft'),
      terkirim: reviews.filter((review) => review.replyState === 'sent'),
    };

    const rows = (buckets[bucket] ?? []).map(toRow);

    return {
      counts: {
        'perlu-tindakan': summary.needsAction,
        'draft-siap': buckets['draft-siap'].length,
        terkirim: summary.sent,
      },
      rows,
    };
  }

  async function reviewDetail(reviewId) {
    const reviews = await loadReviews();
    const review = reviews.find((row) => row.id === reviewId);
    if (!review) return null;

    const draft = await draftFor(review);
    const guardrail = draft.drafted
      ? guardrailCheck({ draftText: draft.text, citations: draft.citations, locale }).data
      : null;
    const persisted = await store.get(tenantId, reviewId);

    return {
      review: toRow(review),
      draft,
      guardrail,
      state: persisted?.state ?? review.replyState,
      approvedBy: persisted?.approvedBy ?? null,
    };
  }

  async function approveAndSend({ reviewId, approvedBy, role }) {
    const reviews = await loadReviews();
    const review = reviews.find((row) => row.id === reviewId);
    const draft = await draftFor(review);

    if (!(await store.get(tenantId, reviewId))) {
      await saveDraft({ tenantId, review, draft, store });
    }
    if (review.rating <= 2) {
      await approveDraft({ tenantId, reviewId, approvedBy, role, store });
    }

    const sent = await sendReply({ tenantId, reviewId, store, gbp, actor: approvedBy });
    return sent.data;
  }

  async function themeMatrix() {
    const reviews = await loadReviews();
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

  return { isSeeded: true, inbox, reviewDetail, approveAndSend, themeMatrix };
}

function toRow(review) {
  return {
    ...review,
    outletName: OUTLET_NAMES[review.outletId] ?? review.outletId,
    relative: relativeLabel(review.publishedAt),
  };
}

const OUTLET_NAMES = {
  'BKS-02': 'Bekasi Timur',
  'CKR-01': 'Cikarang Jababeka',
  'DPK-01': 'Depok Margonda',
  'SRP-03': 'Serpong Sektor 7',
  'BGR-01': 'Bogor Pajajaran',
  'TGR-01': 'Tangerang Alam Sutera',
};

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

/**
 * The branch that is not getting worse on the leading theme — screen 07's
 * "praktik baik terdeteksi" card looks for something to copy, not just
 * something to fix.
 */
function bestPractice(themes, locale) {
  const leading = themes[0];
  if (!leading) return null;

  const entries = Object.entries(leading.byOutlet ?? {}).sort((a, b) => a[1] - b[1]);
  const [outletId, count] = entries[0] ?? [];
  if (!outletId) return null;

  return {
    outletId,
    outletName: OUTLET_NAMES[outletId] ?? outletId,
    theme: leading.theme,
    label: themeLabel(leading.theme, locale),
    count,
  };
}
