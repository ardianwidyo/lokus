import { randomUUID } from 'node:crypto';

import {
  MODEL_FOR_TIER,
  MODEL_TIER,
  createAgentEngineRunStore,
  createBriefingService,
  createBudgetGuard,
  createKnowledgeAgent,
  createGeminiAdapterIfConfigured,
  createKnowledgeService,
  createLocationAgent,
  createLocationService,
  createMemoryRunStore,
  createMemoryTicketStore,
  createOutletService,
  createReputationAgent,
  createReputationService,
  createSeededGbpAdapter,
  createSeededPlacesAdapter,
  createSupervisor,
  createAdminService,
  seedTickets,
  withRunPersistence,
} from '@lokus/core';

import { createAccessTokenProvider } from '../lib/googleAccessToken.js';

/**
 * Where agent runs are kept. Unset, they live in this process and die with it —
 * fine for a test, thin for a judge who asks to see yesterday's trace.
 * `LOKUS_AGENT_ENGINE` points at a reasoningEngine created by
 * `scripts/agent-engine.mjs`; the sessions under it hold the runs.
 */
export function agentEngineFromEnv(env = process.env) {
  const engine = env.LOKUS_AGENT_ENGINE ?? null;
  if (!engine) return null;

  return {
    engine,
    // Agent Engine serves asia-southeast2, unlike the Gemini models, so the
    // runs stay in the region the constitution pins the tenant's data to.
    location: env.LOKUS_AGENT_ENGINE_LOCATION || 'asia-southeast2',
    getAccessToken: createAccessTokenProvider({ env }),
  };
}

/**
 * Vertex AI is opt-in, because `GOOGLE_CLOUD_PROJECT` is set on every run and
 * gating on it alone would silently start billing a demo. `LOKUS_REASONING`
 * has to say `vertex` in so many words; anything else keeps the deterministic
 * path, which is what the public demo and every test run.
 */
export function vertexFromEnv(env = process.env) {
  if ((env.LOKUS_REASONING ?? '').toLowerCase() !== 'vertex') return {};

  const projectId = env.GOOGLE_CLOUD_PROJECT ?? null;
  return {
    projectId,
    // `global` unless pinned: these models are not served from
    // asia-southeast2, where the rest of the stack lives (measured 2026-08-07).
    location: env.GOOGLE_CLOUD_LOCATION || undefined,
    getAccessToken: projectId ? createAccessTokenProvider({ env }) : null,
  };
}

/**
 * Wires the domain for the API process.
 *
 * Everything is in-memory today because the adapters that would make it
 * durable — Business Profile, Firestore, BigQuery — are the parts still
 * waiting on pilot access (spec.md Q1). The seam is here: swapping
 * `createSeededGbpAdapter` for the Google one, and the memory stores for
 * Firestore-backed ones, changes this file and nothing else.
 */
export function createServices({
  evaluationReport,
  budgets = {},
  onBudgetAlert = null,
  onAgentEngineError = null,
  // Credentials are resolved in this process and nowhere else. Unconfigured,
  // every call site uses its deterministic path — which is what the public demo
  // serves, since GitHub Pages has no API behind it and a browser that could
  // mint a Google token would be a browser handing one out.
  vertex = vertexFromEnv(),
  agentEngine = agentEngineFromEnv(),
  env = process.env,
} = {}) {
  const gbp = createSeededGbpAdapter();
  const places = createSeededPlacesAdapter();
  const gemini = createGeminiAdapterIfConfigured(vertex);
  const knowledge = createKnowledgeService({ gemini });
  const runStore = agentEngine
    ? createAgentEngineRunStore({
        ...agentEngine,
        // A failing trace store degrades to memory rather than taking the
        // answer down with it — but it says so in the log, because a quiet
        // degradation is how you find out weeks later that nothing was kept.
        onError: (failure) =>
          onAgentEngineError?.({ event: 'agent_engine_degraded', ...failure }),
      })
    : createMemoryRunStore();
  const ticketStore = createMemoryTicketStore({ seed: seedTickets({ tenantId: 'nusa-retail' }) });

  const budget = createBudgetGuard({ budgets, onAlert: onBudgetAlert });
  // Month-to-date spend for the demo tenant, so screen 14 is not at zero.
  budget.seed('nusa-retail', 1_840_000);

  const supervisor = withRunPersistence(
    createSupervisor({
      // A counter restarts at 1 with the process. That was harmless while runs
      // died with it too; against a store that outlives the process, today's
      // `run-1` would collide with yesterday's.
      idFactory: () => randomUUID(),
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
    gemini,
    // Reported so /healthz and screen 14 can state which reasoning path is
    // live, rather than leaving a reader to guess how the process is configured.
    reasoning: gemini ? 'vertex' : 'deterministic',
    // The pin the reasoning tier would use. Named here rather than at the route
    // because the route should report configuration, not re-derive it.
    reasoningModel: gemini ? MODEL_FOR_TIER[MODEL_TIER.REASONING] : null,
    runStore,
    ticketStore,
    budget,
    supervisor,
    reputation: createReputationService({ gbp, gemini }),
    briefing: createBriefingService({ gbp, places, ticketStore }),
    // `gbp` so screen 14 can report response-time coverage over the outlets
    // whose history is complete, and name the ones it left out (spec AC-9.5).
    // `runtime` so the same screen reports the stack this process actually has
    // rather than the one the architecture diagram hopes for.
    admin: createAdminService({
      budget,
      evaluationReport,
      gbp,
      runtime: {
        reasoning: gemini ? 'vertex' : 'deterministic',
        model: gemini ? MODEL_FOR_TIER[MODEL_TIER.REASONING] : null,
        flashModel: gemini ? MODEL_FOR_TIER[MODEL_TIER.FLASH] : null,
        location: gemini?.location ?? null,
        // Cloud Run sets K_SERVICE. Asserting a deployment from a config value
        // instead would put "Cloud Run" on the screen of a laptop.
        onCloudRun: Boolean(env.K_SERVICE),
        region: env.LOKUS_REGION ?? null,
        // Where the numbered steps behind screen 13 are kept. Named only when
        // the store is really Agent Engine — the memory store is not a managed
        // service and must not be printed as one.
        sessions: runStore.kind === 'agent-engine' ? runStore.location : null,
      },
    }),
    location: createLocationService({ places }),
    outlets: createOutletService({ gbp, places }),
    knowledge,
  };
}
