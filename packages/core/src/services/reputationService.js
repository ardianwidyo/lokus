import { flagSystemicThemes, systemicFinding } from '../analytics/systemic.js';
import { themeCluster } from '../analytics/themeCluster.js';
import { relativeLabel } from '../domain/clock.js';
import { findOutlet } from '../domain/outlets.js';
import { themeLabel } from '../domain/themes.js';
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

  const reviewsByTenant = new Map();
  async function allReviews(tenantId) {
    if (!reviewsByTenant.has(tenantId)) {
      const { data } = await gbp.listReviews({ tenantId, limit: 5000 });
      reviewsByTenant.set(tenantId, data.reviews);
    }
    return reviewsByTenant.get(tenantId);
  }

  const draftCache = new Map();
  async function draftFor(tenantId, review) {
    const key = `${tenantId}:${review.id}`;
    if (!draftCache.has(key)) {
      const result = await draftReply({ tenantId, review, gemini });
      draftCache.set(key, result.data);
    }
    return draftCache.get(key);
  }

  async function inbox(tenantId, { bucket = 'perlu-tindakan' } = {}) {
    assertTenant(tenantId);
    const reviews = await allReviews(tenantId);
    const summary = await replyQueueSummary({ tenantId, reviews, store });

    const buckets = {
      'perlu-tindakan': summary.needsActionReviews,
      'draft-siap': reviews.filter((r) => r.rating >= 3 && r.replyState === 'draft'),
      terkirim: reviews.filter((r) => r.replyState === 'sent'),
    };

    return {
      counts: {
        'perlu-tindakan': summary.needsAction,
        'draft-siap': buckets['draft-siap'].length,
        terkirim: summary.sent,
      },
      rows: (buckets[bucket] ?? []).map(toRow),
    };
  }

  async function reviewDetail(tenantId, reviewId) {
    assertTenant(tenantId);
    const review = (await allReviews(tenantId)).find((row) => row.id === reviewId);
    if (!review) return null;

    const draft = await draftFor(tenantId, review);
    const guardrail = draft.drafted
      ? guardrailCheck({ draftText: draft.text, citations: draft.citations }).data
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

  async function approveAndSend(tenantId, { reviewId, approvedBy, role }) {
    assertTenant(tenantId);
    const review = (await allReviews(tenantId)).find((row) => row.id === reviewId);
    if (!review) return null;

    const draft = await draftFor(tenantId, review);

    if (!(await store.get(tenantId, reviewId))) {
      await saveDraft({ tenantId, review, draft, store });
    }
    // Constitution II: 1-2 stars need a named human. The role check inside
    // approveDraft refuses a viewer even if a route somehow let one through.
    if (review.rating <= 2) {
      await approveDraft({ tenantId, reviewId, approvedBy, role, store });
    }

    const sent = await sendReply({ tenantId, reviewId, store, gbp, actor: approvedBy });
    return sent.data;
  }

  async function themeMatrix(tenantId) {
    assertTenant(tenantId);
    const reviews = await allReviews(tenantId);
    const { data, sources } = await themeCluster({ tenantId, reviews });
    const themes = flagSystemicThemes(data.themes);

    return {
      themes: themes.map((theme) => ({ ...theme, label: themeLabel(theme.theme) })),
      finding: systemicFinding(data.themes),
      weeks: data.weeks,
      reviewsConsidered: data.reviewsConsidered,
      sourceCount: sources.length,
      sentimentByWeek: sentimentByWeek(reviews, data.weeks),
      bestPractice: bestPractice(themes),
    };
  }

  return { inbox, reviewDetail, approveAndSend, themeMatrix, store };
}

function toRow(review) {
  return {
    ...review,
    outletName: findOutlet(review.outletId)?.name ?? review.outletId,
    relative: relativeLabel(review.publishedAt),
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
function bestPractice(themes) {
  const leading = themes[0];
  if (!leading) return null;

  const entries = Object.entries(leading.byOutlet ?? {}).sort((a, b) => a[1] - b[1]);
  const [outletId, count] = entries[0] ?? [];
  if (!outletId) return null;

  return {
    outletId,
    outletName: findOutlet(outletId)?.name ?? outletId,
    theme: leading.theme,
    label: themeLabel(leading.theme),
    count,
  };
}
