import { randomUUID } from 'node:crypto';

import {
  MODEL_FOR_TIER,
  MODEL_TIER,
  createAgentEngineRunStore,
  createBriefingService,
  createBudgetGuard,
  createKnowledgeAgent,
  REASONING_PATH,
  createReasoningSwitch,
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
 * Both reasoning paths, built from the environment, plus which one starts
 * active. Credentials are resolved here and nowhere else: the switch decides
 * which adapter answers, it never holds a key.
 *
 * `LOKUS_REASONING` names the starting path. `LOKUS_REASONING_SWITCHABLE`
 * decides whether screen 14 may change it — read-only by default, because the
 * choice is process-wide and one tenant's admin must not be able to change how
 * another tenant's answers are produced.
 */
export function reasoningFromEnv(env = process.env) {
  const projectId = env.GOOGLE_CLOUD_PROJECT ?? null;

  return {
    path: (env.LOKUS_REASONING ?? REASONING_PATH.DETERMINISTIC).toLowerCase(),
    mutable: env.LOKUS_REASONING_SWITCHABLE === 'true',
    vertex: {
      projectId,
      // `global` unless pinned: these models are not served from
      // asia-southeast2, where the rest of the stack lives (measured 2026-08-07).
      location: env.GOOGLE_CLOUD_LOCATION || undefined,
      getAccessToken: projectId ? createAccessTokenProvider({ env }) : null,
    },
    // Free from AI Studio and needs no billing account, which is why it stays
    // on offer: it is the cheapest way to run this repo for real.
    apikey: { apiKey: env.GEMINI_API_KEY ?? null },
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
  onReasoningChange = null,
  // Credentials are resolved in this process and nowhere else. Unconfigured,
  // every call site uses its deterministic path — which is what the public demo
  // serves, since GitHub Pages has no API behind it and a browser that could
  // mint a Google token would be a browser handing one out.
  reasoning = reasoningFromEnv(),
  agentEngine = agentEngineFromEnv(),
  env = process.env,
} = {}) {
  const gbp = createSeededGbpAdapter();
  const places = createSeededPlacesAdapter();
  // One object the whole domain shares, so flipping the path on screen 14
  // takes effect on the next question rather than on the next deploy.
  const gemini = createReasoningSwitch({ ...reasoning, onChange: onReasoningChange });
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
    // Reported live: the path can change while the process runs.
    get reasoning() {
      return gemini.path;
    },
    // The pin the reasoning tier would use. Named here rather than at the route
    // because the route should report configuration, not re-derive it.
    get reasoningModel() {
      return gemini.enabled ? MODEL_FOR_TIER[MODEL_TIER.REASONING] : null;
    },
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
        get reasoning() {
          return gemini.path;
        },
        get model() {
          return gemini.enabled ? MODEL_FOR_TIER[MODEL_TIER.REASONING] : null;
        },
        get flashModel() {
          return gemini.enabled ? MODEL_FOR_TIER[MODEL_TIER.FLASH] : null;
        },
        get location() {
          return gemini.path === REASONING_PATH.VERTEX ? (reasoning.vertex?.location ?? 'global') : null;
        },
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
