import { approveBriefingDecision } from '../briefing/approveDecision.js';
import { runNightlyCycle } from '../briefing/nightlyCycle.js';
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
export function createBriefingService({ gbp, ticketStore, warehouse = null } = {}) {
  const cache = new Map();

  async function briefing(tenantId) {
    assertTenant(tenantId);

    if (!cache.has(tenantId)) {
      cache.set(
        tenantId,
        runNightlyCycle({ tenantId, gbp, warehouse: warehouse ?? createMemoryWarehouse() }),
      );
    }

    const result = await cache.get(tenantId);
    const { data } = await gbp.listReviews({ tenantId, limit: 5000 });

    return { ...result, metrics: networkMetrics(data.reviews, result) };
  }

  async function approveDecision(tenantId, decision, { approvedBy, role }) {
    assertTenant(tenantId);
    return approveBriefingDecision({ tenantId, decision, approvedBy, role, ticketStore });
  }

  return { briefing, approveDecision };
}

/** The four metric cards, all derived from the same review set as the timeline. */
function networkMetrics(reviews, briefing) {
  const rating = reviews.reduce((sum, review) => sum + review.rating, 0) / (reviews.length || 1);
  const unanswered = reviews.filter((review) => review.replyState === 'none').length;

  const byOutlet = new Map();
  for (const review of reviews) {
    const bucket = byOutlet.get(review.outletId) ?? { sum: 0, count: 0 };
    bucket.sum += review.rating;
    bucket.count += 1;
    byOutlet.set(review.outletId, bucket);
  }

  const needsAttention = [...byOutlet.values()].filter((b) => b.sum / b.count < 4).length;

  return [
    {
      id: 'rating',
      kicker: 'Rating jaringan',
      value: rating.toFixed(2).replace('.', ','),
      note: `rata-rata ${reviews.length} review dalam 8 pekan`,
    },
    {
      id: 'unanswered',
      kicker: 'Belum dibalas',
      value: String(unanswered),
      note: `${briefing.heldForApproval} menunggu persetujuan Anda`,
    },
    {
      id: 'replied',
      kicker: 'Dibalas otomatis',
      value: String(briefing.repliesSent),
      note: 'semua bintang 3–5, tanpa persetujuan manual',
    },
    {
      id: 'attention',
      kicker: 'Cabang perlu perhatian',
      value: String(needsAttention),
      note: `dari ${byOutlet.size} cabang · rating di bawah 4,0`,
    },
  ];
}
