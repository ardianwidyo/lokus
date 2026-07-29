import {
  approveBriefingDecision,
  createMemoryTicketStore,
  createMemoryWarehouse,
  createSeededGbpAdapter,
  createSeededPlacesAdapter,
  runNightlyCycle,
} from '@lokus/core';

/**
 * Briefing data for screen 02.
 *
 * The seeded implementation runs the real overnight cycle in the browser, so
 * the timeline and the three decisions are the output of actual clustering over
 * actual review text — not a fixture shaped to look like one.
 *
 * The network metric cards are computed from the same review set, so a number
 * on the card and a number in the timeline can never disagree.
 */
export function createSeededBriefingSource({ tenantId = 'nusa-retail', ticketStore = null } = {}) {
  const gbp = createSeededGbpAdapter();
  const places = createSeededPlacesAdapter();
  const tickets = ticketStore ?? createMemoryTicketStore();

  let briefingPromise = null;
  const load = () => {
    briefingPromise ??= runNightlyCycle({
      tenantId,
      gbp,
      places,
      warehouse: createMemoryWarehouse(),
    });
    return briefingPromise;
  };

  async function briefing() {
    const result = await load();
    const { data } = await gbp.listReviews({ tenantId, limit: 5000 });

    return { ...result, metrics: networkMetrics(data.reviews, result) };
  }

  /**
   * AC-1.3: approving a decision creates a ticket with an owner and a due date.
   * The owner is the person who can act — the branch manager, or Ops Excellence
   * for a network-level finding — while the approver is recorded separately.
   */
  async function approveDecision(decision, { approvedBy, role = 'manager' }) {
    return approveBriefingDecision({
      tenantId,
      decision,
      approvedBy,
      role,
      ticketStore: tickets,
    });
  }

  return { isSeeded: true, briefing, approveDecision, tickets };
}

/** The four metric cards under the timeline, all derived from the review set. */
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

  const needsAttention = [...byOutlet.values()].filter(
    (bucket) => bucket.sum / bucket.count < 4,
  ).length;

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
