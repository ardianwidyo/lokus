import Fastify from 'fastify';

import { createServices } from './services/index.js';

/**
 * The supervisor, served as an Agent Engine container.
 *
 * Agent Runtime's BYOC contract is two paths and nothing else:
 *
 *   POST /api/reasoning_engine         {class_method, input} → {output}
 *   POST /api/stream_reasoning_engine  {class_method, input} → newline JSON
 *
 * It listens on `$PORT`, which Google sets. Everything else — auth, tenant
 * headers, RBAC — is absent on purpose: this process is not on the internet.
 * Agent Engine authenticates the caller and forwards an already-authorised
 * request, so the tenant arrives inside `input`, and the only job here is to
 * refuse to answer without one.
 *
 * The same `createServices` the HTTP API wires, so the supervisor that runs
 * here is the supervisor that runs there — routing, delegation, guardrails and
 * the numbered trace are one implementation, not two that drift.
 *
 * What this deliberately does not do is persist runs. When the supervisor runs
 * inside Agent Engine, the caller is the API, and the API is what writes the
 * session — otherwise a run would be recorded twice, once from each side.
 */

/**
 * A missing tenant is a malformed request, not a server fault. It reads as a
 * 500 otherwise, and a caller retrying a 500 forever is a caller that will
 * never be told what it got wrong.
 */
function requireTenant(input) {
  const tenantId = input?.tenantId;
  if (!tenantId) {
    const error = new Error('tenantId wajib ada di input');
    error.statusCode = 400;
    throw error;
  }
  return tenantId;
}

/** Every method a caller may invoke, and how. Mirrors `classMethods` on create. */
export const CLASS_METHODS = Object.freeze([
  { name: 'ask', api_mode: '' },
  { name: 'briefing', api_mode: '' },
]);

export function buildAgentRuntime({ services = null, logger } = {}) {
  const domain = services ?? createServices({ evaluationReport: { generatedAt: null, cases: 0, gates: [] } });
  const fastify = Fastify({ logger: logger ?? { level: process.env.LOG_LEVEL ?? 'info' } });

  /**
   * A method table rather than a switch on a string from the request: an
   * unknown `class_method` must be a refusal, never a path into whatever
   * property happens to share its name.
   */
  const methods = {
    async ask(input) {
      const tenantId = requireTenant(input);

      // `withRunPersistence` is not in this path — see the note above.
      return domain.supervisor.ask({
        tenantId,
        question: String(input.question ?? ''),
        context: input.context ?? {},
        locale: input.locale,
      });
    },

    async briefing(input) {
      const tenantId = requireTenant(input);
      return domain.briefing.briefing(tenantId, { locale: input.locale });
    },
  };

  async function invoke(request) {
    const name = request.body?.class_method ?? 'ask';
    const method = Object.prototype.hasOwnProperty.call(methods, name) ? methods[name] : null;
    if (!method) {
      const error = new Error(`class_method "${name}" tidak dikenal`);
      error.statusCode = 400;
      throw error;
    }
    return method(request.body?.input ?? {});
  }

  fastify.post('/api/reasoning_engine', async (request) => ({ output: await invoke(request) }));

  // Declared because the contract names it. Nothing here streams yet — the
  // supervisor answers once, after every agent has — so it emits the single
  // result in the stream's shape rather than pretending to be incremental.
  fastify.post('/api/stream_reasoning_engine', async (request, reply) => {
    const output = await invoke(request);
    reply.type('application/json').send(`${JSON.stringify({ output })}\n`);
  });

  // Agent Runtime probes the container before it sends traffic.
  fastify.get('/healthz', async () => ({ status: 'ok', methods: CLASS_METHODS.map((m) => m.name) }));

  return fastify;
}

/* c8 ignore start -- process bootstrap, exercised by the container not by tests */
if (process.env.NODE_ENV !== 'test') {
  const fastify = buildAgentRuntime();
  const port = Number(process.env.PORT ?? 8080);

  fastify.listen({ port, host: '0.0.0.0' }).catch((error) => {
    fastify.log.error(error, 'agent runtime gagal start');
    process.exit(1);
  });

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => fastify.close().then(() => process.exit(0)));
  }
}
/* c8 ignore stop */
