import {
  createBriefingService,
  createBudgetGuard,
  createKnowledgeAgent,
  createKnowledgeService,
  createLocationAgent,
  createLocationService,
  createMemoryRunStore,
  createMemoryTicketStore,
  createReputationAgent,
  createReputationService,
  createSeededGbpAdapter,
  createSeededPlacesAdapter,
  createSupervisor,
  createAdminService,
  seedTickets,
  withRunPersistence,
} from '@lokus/core';

/**
 * Wires the domain for the API process.
 *
 * Everything is in-memory today because the adapters that would make it
 * durable — Business Profile, Firestore, BigQuery — are the parts still
 * waiting on pilot access (spec.md Q1). The seam is here: swapping
 * `createSeededGbpAdapter` for the Google one, and the memory stores for
 * Firestore-backed ones, changes this file and nothing else.
 */
export function createServices({ evaluationReport, budgets = {}, onBudgetAlert = null } = {}) {
  const gbp = createSeededGbpAdapter();
  const places = createSeededPlacesAdapter();
  const knowledge = createKnowledgeService();
  const runStore = createMemoryRunStore();
  const ticketStore = createMemoryTicketStore({ seed: seedTickets({ tenantId: 'nusa-retail' }) });

  const budget = createBudgetGuard({ budgets, onAlert: onBudgetAlert });
  // Month-to-date spend for the demo tenant, so screen 14 is not at zero.
  budget.seed('nusa-retail', 1_840_000);

  const supervisor = withRunPersistence(
    createSupervisor({
      gapLog: knowledge.gapLog,
      agents: {
        reputation: createReputationAgent({ gbp }),
        knowledge: createKnowledgeAgent(),
        location: createLocationAgent({ places }),
      },
    }),
    runStore,
  );

  return {
    gbp,
    places,
    runStore,
    ticketStore,
    budget,
    supervisor,
    reputation: createReputationService({ gbp }),
    briefing: createBriefingService({ gbp, places, ticketStore }),
    admin: createAdminService({ budget, evaluationReport }),
    location: createLocationService({ places }),
    knowledge,
  };
}
