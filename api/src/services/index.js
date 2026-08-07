import {
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
  // Credentials are resolved in this process and nowhere else. Unconfigured,
  // every call site uses its deterministic path — which is what the public demo
  // serves, since GitHub Pages has no API behind it and a browser that could
  // mint a Google token would be a browser handing one out.
  vertex = vertexFromEnv(),
} = {}) {
  const gbp = createSeededGbpAdapter();
  const places = createSeededPlacesAdapter();
  const gemini = createGeminiAdapterIfConfigured(vertex);
  const knowledge = createKnowledgeService({ gemini });
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
    gemini,
    // Reported so /healthz and screen 14 can state which reasoning path is
    // live, rather than leaving a reader to guess how the process is configured.
    reasoning: gemini ? 'vertex' : 'deterministic',
    runStore,
    ticketStore,
    budget,
    supervisor,
    reputation: createReputationService({ gbp, gemini }),
    briefing: createBriefingService({ gbp, places, ticketStore }),
    // `gbp` so screen 14 can report response-time coverage over the outlets
    // whose history is complete, and name the ones it left out (spec AC-9.5).
    admin: createAdminService({ budget, evaluationReport, gbp }),
    location: createLocationService({ places }),
    outlets: createOutletService({ gbp, places }),
    knowledge,
  };
}
