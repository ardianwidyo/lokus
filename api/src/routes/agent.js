import { answerActions } from '@lokus/core';

import { badRequest } from '../lib/errors.js';

/** The agent conversation — screen 10. */
export function agentRoutes(fastify, { supervisor, budget = null }) {
  fastify.post(
    '/v1/agent/ask',
    { preHandler: [fastify.authenticate, fastify.withTenant] },
    async (request) => {
      const question = String(request.body?.question ?? '').trim();
      if (!question) throw badRequest('QUESTION_REQUIRED', 'A question is required');

      // Constitution V: check the ceiling before spending, not after. A refusal
      // here surfaces as a budget error the UI can explain, not a blank answer.
      budget?.reserve(request.tenant.id, ESTIMATED_ASK_IDR);

      const run = await supervisor.ask({ tenantId: request.tenant.id, question });
      budget?.record(request.tenant.id, run.costIdr);

      request.log.info(
        { event: 'agent.ask', runId: run.id, intent: run.intent, refused: run.refused, costIdr: run.costIdr },
        'agent run complete',
      );

      return { run, actions: answerActions(run) };
    },
  );
}

/** Rough pre-flight estimate; the real cost is recorded after the run. */
const ESTIMATED_ASK_IDR = 500;
