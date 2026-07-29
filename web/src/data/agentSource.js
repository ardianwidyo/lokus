import {
  createKnowledgeAgent,
  createMemoryRunStore,
  createReputationAgent,
  createSeededGbpAdapter,
  createSupervisor,
  createUnavailableAgent,
  withRunPersistence,
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
export function createSeededAgentSource({ tenantId = 'nusa-retail' } = {}) {
  const runStore = createMemoryRunStore();

  const supervisor = withRunPersistence(
    createSupervisor({
      agents: {
        reputation: createReputationAgent({ gbp: createSeededGbpAdapter() }),
        knowledge: createKnowledgeAgent(),
        // Registered, and honest about being unbuilt: the trace records the
        // step and the answer says the perspective is missing (fase P3).
        location: createUnavailableAgent(
          'location',
          'Agen Lokasi',
          'Agen Lokasi belum aktif pada build ini (fase P3).',
        ),
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

  return { isSeeded: true, ask, getRun, recentRuns };
}

/** The three prompts screen 10 offers below the composer. */
export const SUGGESTED_QUESTIONS = Object.freeze([
  'Ringkas keluhan pekan ini',
  'Kenapa rating cabang Bekasi Timur turun bulan ini?',
  'Apa kata SOP soal refund?',
]);
