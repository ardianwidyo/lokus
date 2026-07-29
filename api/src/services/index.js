import {
  createBriefingService,
  createBudgetGuard,
  createKnowledgeAgent,
  createMemoryRunStore,
  createMemoryTicketStore,
  createReputationAgent,
  createReputationService,
  createSeededGbpAdapter,
  createSupervisor,
  createUnavailableAgent,
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
  const runStore = createMemoryRunStore();
  const ticketStore = createMemoryTicketStore({ seed: seedTickets({ tenantId: 'nusa-retail' }) });

  const budget = createBudgetGuard({ budgets, onAlert: onBudgetAlert });
  // Month-to-date spend for the demo tenant, so screen 14 is not at zero.
  budget.seed('nusa-retail', 1_840_000);

  const supervisor = withRunPersistence(
    createSupervisor({
      agents: {
        reputation: createReputationAgent({ gbp }),
        knowledge: createKnowledgeAgent(),
        // Registered and honest: the trace records the step, and the answer
        // says which perspective is missing (fase P3).
        location: createUnavailableAgent(
          'location',
          'Agen Lokasi',
          'Agen Lokasi belum aktif pada build ini (fase P3).',
        ),
      },
    }),
    runStore,
  );

  return {
    gbp,
    runStore,
    ticketStore,
    budget,
    supervisor,
    reputation: createReputationService({ gbp }),
    briefing: createBriefingService({ gbp, ticketStore }),
    admin: createAdminService({ budget, evaluationReport }),
  };
}
