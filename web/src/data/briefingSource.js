import {
  DEFAULT_LOCALE,
  approveBriefingDecision,
  createMemoryTicketStore,
  createMemoryWarehouse,
  createSeededGbpAdapter,
  createSeededPlacesAdapter,
  networkMetrics,
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
 * on the card and a number in the timeline can never disagree. `networkMetrics`
 * itself lives in `packages/core/src/services/briefingService.js` — the API's
 * briefing service uses the identical function, so the four cards cannot drift
 * between what the seeded console shows and what a deployed one would.
 *
 * `locale` is closed over at construction; `SessionContext` rebuilds this source
 * when the reader's language changes, the same way it rebuilds on a tenant
 * switch.
 */
export function createSeededBriefingSource({
  tenantId = 'nusa-retail',
  ticketStore = null,
  locale = DEFAULT_LOCALE,
} = {}) {
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
      locale,
    });
    return briefingPromise;
  };

  async function briefing() {
    const result = await load();
    const { data } = await gbp.listReviews({ tenantId, limit: 5000 });

    return { ...result, metrics: networkMetrics(data.reviews, result, locale) };
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
      locale,
    });
  }

  return { isSeeded: true, briefing, approveDecision, tickets };
}
