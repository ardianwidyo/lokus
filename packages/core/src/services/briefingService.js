import { approveBriefingDecision } from '../briefing/approveDecision.js';
import { runNightlyCycle } from '../briefing/nightlyCycle.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { localeNumber } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { assertTenant } from '../lib/tenantScope.js';
import { createMemoryWarehouse } from '../pipeline/warehouse.js';

/**
 * Briefing Pagi, composed once for both callers — screen 02.
 *
 * The cycle is expensive (it loads, clusters and ranks the whole review set),
 * so it is memoised per tenant. In production Cloud Scheduler writes the
 * briefing overnight and this reads it; here it is computed on first request,
 * which is the same output by the same code.
 */
export function createBriefingService({ gbp, places = null, ticketStore, warehouse = null } = {}) {
  const cache = new Map();

  /**
   * The cycle is keyed by tenant *and* locale: two readers of the same tenant in
   * different languages must not be served each other's prose, and caching on
   * the tenant alone would hand whichever of them asked second the other's
   * timeline.
   */
  async function briefing(tenantId, { locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);
    const key = `${tenantId}:${locale}`;

    if (!cache.has(key)) {
      cache.set(
        key,
        runNightlyCycle({
          tenantId,
          gbp,
          places,
          warehouse: warehouse ?? createMemoryWarehouse(),
          locale,
        }),
      );
    }

    const result = await cache.get(key);
    const { data } = await gbp.listReviews({ tenantId, limit: 5000 });

    return { ...result, metrics: networkMetrics(data.reviews, result, locale) };
  }

  async function approveDecision(tenantId, decision, { approvedBy, role, locale = DEFAULT_LOCALE }) {
    assertTenant(tenantId);
    return approveBriefingDecision({ tenantId, decision, approvedBy, role, ticketStore, locale });
  }

  return { briefing, approveDecision };
}

/** Below this weekly mean a branch is flagged as needing attention. */
const ATTENTION_RATING = 4;

/**
 * The four metric cards, all derived from the same review set as the timeline —
 * so a number on a card and a number in the timeline can never disagree.
 *
 * Exported because the console's seeded source needs exactly these four, and two
 * implementations of "the network rating" is how they drift apart.
 */
export function networkMetrics(reviews, briefing, locale = DEFAULT_LOCALE) {
  const rating = reviews.reduce((sum, review) => sum + review.rating, 0) / (reviews.length || 1);
  const unanswered = reviews.filter((review) => review.replyState === 'none').length;

  const byOutlet = new Map();
  for (const review of reviews) {
    const bucket = byOutlet.get(review.outletId) ?? { sum: 0, count: 0 };
    bucket.sum += review.rating;
    bucket.count += 1;
    byOutlet.set(review.outletId, bucket);
  }

  const needsAttention = [...byOutlet.values()].filter(
    (b) => b.sum / b.count < ATTENTION_RATING,
  ).length;

  return [
    {
      id: 'rating',
      kicker: t(locale, 'metric.ratingKicker'),
      value: localeNumber(locale, rating),
      note: t(locale, 'metric.ratingNote', { count: reviews.length }),
    },
    {
      id: 'unanswered',
      kicker: t(locale, 'metric.unansweredKicker'),
      value: String(unanswered),
      note: t(locale, 'metric.unansweredNote', { held: briefing.heldForApproval }),
    },
    {
      id: 'replied',
      kicker: t(locale, 'metric.repliedKicker'),
      value: String(briefing.repliesSent),
      note: t(locale, 'metric.repliedNote'),
    },
    {
      id: 'attention',
      kicker: t(locale, 'metric.attentionKicker'),
      value: String(needsAttention),
      note: t(locale, 'metric.attentionNote', {
        count: byOutlet.size,
        threshold: localeNumber(locale, ATTENTION_RATING, 1),
      }),
    },
  ];
}
