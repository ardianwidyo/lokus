import {
  createKnowledgeAgent,
  createLocationAgent,
  createMemoryRunStore,
  createReputationAgent,
  createSeededGbpAdapter,
  createSeededPlacesAdapter,
  createMemoryTicketStore,
  createSupervisor,
  withRunPersistence,
  answerActions,
} from '@lokus/core';

/**
 * Agent conversation for screen 10.
 *
 * The seeded implementation runs the real supervisor in the browser: routing,
 * parallel delegation, merge, guardrails and the refusal rule are the same code
 * the API executes. Only the tool adapters underneath are seeded.
 *
 * That matters for the demo: the execution trace on screen is a record of work
 * that actually happened, not a scripted animation.
 */
export function createSeededAgentSource({ tenantId = 'nusa-retail', ticketStore = null } = {}) {
  const runStore = createMemoryRunStore();
  const places = createSeededPlacesAdapter();
  const tickets = ticketStore ?? createMemoryTicketStore();

  const supervisor = withRunPersistence(
    createSupervisor({
      agents: {
        reputation: createReputationAgent({ gbp: createSeededGbpAdapter() }),
        knowledge: createKnowledgeAgent(),
        location: createLocationAgent({ places }),
      },
    }),
    runStore,
  );

  async function ask(question) {
    return supervisor.ask({ tenantId, question });
  }

  async function getRun(id) {
    return runStore.get(tenantId, id);
  }

  async function recentRuns(limit = 10) {
    return runStore.list(tenantId, { limit });
  }

  /** AC-7.3: what this particular answer makes possible. */
  function actionsFor(run) {
    return answerActions(run);
  }

  async function createTicket(payload) {
    return tickets.create(tenantId, { ...payload, createdBy: 'agen' });
  }

  return { isSeeded: true, ask, getRun, recentRuns, actionsFor, createTicket, tickets };
}

/** The three prompts screen 10 offers below the composer. */
export const SUGGESTED_QUESTIONS = Object.freeze([
  'Ringkas keluhan pekan ini',
  'Kenapa rating cabang Bekasi Timur turun bulan ini?',
  'Apa kata SOP soal refund?',
]);
