import { assertTenant, scopeToTenant } from '../lib/tenantScope.js';

/**
 * Agent run persistence — constitution III: "a run that cannot be explained is
 * a bug, not a feature".
 *
 * Firestore in production (`agent_runs` collection, indexed by tenant and
 * start time in infra/firestore.tf), memory here and in tests, behind one
 * interface.
 *
 * Steps are appended as they happen rather than written once at the end. A run
 * that crashes halfway must still leave behind the steps it completed —
 * otherwise the traces you most need are exactly the ones you never get.
 */
export function createMemoryRunStore() {
  const runs = new Map(); // `${tenantId}:${id}` -> run

  const key = (tenantId, id) => `${tenantId}:${id}`;

  return {
    kind: 'memory',

    async start(tenantId, { id, question, intent, agents, startedAt }) {
      assertTenant(tenantId);
      const run = {
        id,
        tenantId,
        question,
        intent,
        agents,
        steps: [],
        status: 'running',
        startedAt,
        finishedAt: null,
      };
      runs.set(key(tenantId, id), run);
      return run;
    },

    async appendStep(tenantId, id, step) {
      assertTenant(tenantId);
      const run = runs.get(key(tenantId, id));
      if (!run) return null;
      run.steps.push(step);
      return step;
    },

    async finish(tenantId, id, outcome) {
      assertTenant(tenantId);
      const run = runs.get(key(tenantId, id));
      if (!run) return null;

      Object.assign(run, outcome, { status: outcome.refused ? 'refused' : 'ok' });
      return run;
    },

    async get(tenantId, id) {
      assertTenant(tenantId);
      const run = runs.get(key(tenantId, id));
      // A run belonging to another tenant is invisible, not merely forbidden.
      return run && run.tenantId === tenantId ? structuredClone(run) : null;
    },

    async list(tenantId, { limit = 20 } = {}) {
      assertTenant(tenantId);
      return scopeToTenant(tenantId, [...runs.values()])
        .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
        .slice(0, limit)
        .map((run) => structuredClone(run));
    },
  };
}

/**
 * Wraps a supervisor so every ask is persisted. Kept separate from the
 * supervisor itself so the reasoning and the storage can be tested apart, and
 * so a caller that does not want persistence simply does not wrap.
 */
export function withRunPersistence(supervisor, store) {
  return {
    ...supervisor,

    async ask(request) {
      const run = await supervisor.ask(request);

      await store.start(run.tenantId, {
        id: run.id,
        question: run.question,
        intent: run.intent,
        agents: run.agents,
        startedAt: run.startedAt,
      });

      for (const step of run.steps) {
        await store.appendStep(run.tenantId, run.id, step);
      }

      await store.finish(run.tenantId, run.id, {
        answer: run.answer,
        refused: run.refused,
        outletId: run.outletId,
        sourceCount: run.sources.length,
        sourceSummary: run.sourceSummary,
        unavailable: run.unavailable,
        guardrail: run.guardrail,
        latencyMs: run.latencyMs,
        costIdr: run.costIdr,
        finishedAt: run.finishedAt,
      });

      return run;
    },
  };
}
