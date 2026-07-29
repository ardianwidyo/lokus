import { notFound } from '../lib/errors.js';

/**
 * `GET /v1/runs/:id` and `GET /v1/runs` — AC-7.2.
 *
 * The trace is a first-class resource, not a debug log: screen 10 renders it
 * next to the answer it produced, and a judge can fetch the same JSON.
 *
 * Every read is tenant-scoped, so a run id guessed from another tenant returns
 * the same 404 as one that never existed.
 */
export function runRoutes(fastify, { runStore }) {
  fastify.get(
    '/v1/runs/:id',
    { preHandler: [fastify.authenticate, fastify.withTenant] },
    async (request) => {
      const run = await runStore.get(request.tenant.id, request.params.id);
      if (!run) throw notFound('Agent run not found');

      request.log.info({ event: 'run.read', runId: run.id }, 'agent run read');
      return { run };
    },
  );

  fastify.get(
    '/v1/runs',
    { preHandler: [fastify.authenticate, fastify.withTenant] },
    async (request) => {
      const limit = Math.min(Number(request.query.limit ?? 20) || 20, 100);
      const runs = await runStore.list(request.tenant.id, { limit });

      return {
        runs: runs.map((run) => ({
          id: run.id,
          question: run.question,
          intent: run.intent,
          status: run.status,
          stepCount: run.steps.length,
          latencyMs: run.latencyMs,
          costIdr: run.costIdr,
          startedAt: run.startedAt,
        })),
      };
    },
  );
}
