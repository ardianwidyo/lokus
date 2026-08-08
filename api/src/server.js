import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import { UPLOAD_MAX_BYTES } from '@lokus/core';

import { createDevVerifier, isDevAuthEnabled } from './auth/devPrincipal.js';
import { createTokenVerifier } from './auth/verifyIdToken.js';
import { HttpError } from './lib/errors.js';
import { registerAuth } from './plugins/auth.js';
import { registerLocale } from './plugins/locale.js';
import { createSeededTenantDirectory } from './repositories/tenantDirectory.js';
import { createServices } from './services/index.js';
import { adminRoutes } from './routes/admin.js';
import { agentRoutes } from './routes/agent.js';
import { briefingRoutes } from './routes/briefing.js';
import { healthRoutes } from './routes/health.js';
import { knowledgeRoutes } from './routes/knowledge.js';
import { locationRoutes } from './routes/location.js';
import { outletRoutes } from './routes/outlets.js';
import { reputationRoutes } from './routes/reputation.js';
import { runRoutes } from './routes/runs.js';
import { sessionRoutes } from './routes/session.js';

/**
 * Builds the server without listening, so tests drive it through
 * `fastify.inject` and no port is bound during CI.
 *
 * Every collaborator is injectable: tests substitute a locally signed key set
 * and in-memory stores, production gets Google's JWKS and the real adapters.
 */
export function buildServer({
  config,
  verifyIdToken,
  tenantDirectory,
  runStore,
  services,
  evaluationReport = EMPTY_REPORT,
  env = process.env,
  logger,
} = {}) {
  const fastify = Fastify({
    logger: logger ?? { level: env.LOG_LEVEL ?? 'info' },
    trustProxy: true,
  });

  const domain =
    services ??
    createServices({
      evaluationReport,
      onBudgetAlert: (alert) =>
        fastify.log.warn({ event: 'budget_degraded', ...alert }, alert.message),
      // A trace store that fell back to memory is a degradation worth seeing in
      // the logs, not a silence to discover when a run cannot be produced.
      onAgentEngineError: (failure) =>
        fastify.log.warn(failure, `agent engine ${failure.operation} gagal: ${failure.message}`),
      onReasoningChange: (change) =>
        fastify.log.warn({ event: 'reasoning.path_changed', ...change }, `jalur penalaran: ${change.from} → ${change.to}`),
    });

  const directory = tenantDirectory ?? createSeededTenantDirectory();
  const verifier = verifyIdToken ?? buildVerifier(config, env, fastify.log, directory);
  const runs = runStore ?? domain.runStore;

  // Registered before the routes so preflight is answered for all of them.
  // An empty allowlist means no cross-origin caller is permitted, which is the
  // right default: same-origin deployments need nothing, and a misconfigured
  // one should fail closed.
  fastify.register(cors, {
    origin: config?.allowedOrigins?.length ? config.allowedOrigins : false,
    methods: ['GET', 'POST', 'OPTIONS'],
    // `accept-language` is on the list because the console sends it explicitly
    // rather than relying on the browser's own; without it the preflight fails
    // and every request falls back to Indonesian.
    allowedHeaders: ['accept-language', 'authorization', 'content-type', 'x-lokus-tenant'],
    // A cross-origin console cannot read a response header unless it is exposed.
    // Without these two a downloaded document arrives with a generated name and
    // no way to say whether it is the original or the indexed text (AC-10.11).
    exposedHeaders: ['content-disposition', 'x-lokus-file-origin'],
    maxAge: 600,
  });

  // Document uploads (AC-10.12). The ceilings are the point of registering it
  // here rather than per route: `fileSize` cuts the stream at the limit instead
  // of after the buffer is full, and the counts stop a request from arriving
  // with a thousand parts to allocate for.
  const uploadMaxBytes = config?.storage?.uploadMaxBytes ?? UPLOAD_MAX_BYTES;
  fastify.register(multipart, {
    limits: { fileSize: uploadMaxBytes, files: 1, fields: 8, parts: 12 },
  });

  // Before auth: a request rejected for its token should still have been logged
  // with the locale it asked for.
  registerLocale(fastify);
  registerAuth(fastify, { verifyIdToken: verifier });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      request.log.warn(
        { code: error.code, statusCode: error.statusCode, tenantId: request.tenant?.id ?? null },
        'request rejected',
      );
      return reply.status(error.statusCode).send(error.toJSON());
    }

    // Domain errors carry a code but no status. They are the caller's fault,
    // not the server's, and the code is what the UI switches on — returning
    // 500 would make a refused approval look like an outage.
    if (typeof error.code === 'string' && !error.statusCode) {
      request.log.warn({ code: error.code, tenantId: request.tenant?.id ?? null }, 'domain rejected');
      return reply.status(422).send({ error: { code: error.code, message: error.message } });
    }

    request.log.error({ err: error, tenantId: request.tenant?.id ?? null }, 'unhandled error');
    return reply
      .status(error.statusCode && error.statusCode < 500 ? error.statusCode : 500)
      .send({ error: { code: 'INTERNAL', message: 'Request failed' } });
  });

  healthRoutes(fastify, {
    config,
    snapshot: () => ({ reasoning: domain.reasoning, model: domain.reasoningModel }),
  });
  sessionRoutes(fastify, { tenantDirectory: directory });
  runRoutes(fastify, { runStore: runs });
  reputationRoutes(fastify, { reputation: domain.reputation });
  briefingRoutes(fastify, { briefing: domain.briefing, tickets: domain.ticketStore });
  agentRoutes(fastify, { supervisor: domain.supervisor, budget: domain.budget });
  adminRoutes(fastify, { admin: domain.admin, reasoning: domain.gemini });
  locationRoutes(fastify, { location: domain.location });
  knowledgeRoutes(fastify, { knowledge: domain.knowledge, uploadMaxBytes });
  outletRoutes(fastify, { outlets: domain.outlets });

  return fastify;
}

/**
 * Dev mode is opt-in and cannot exist in production: `createDevVerifier`
 * throws when NODE_ENV is production, so the server fails to boot rather than
 * starting with unverified identities accepted.
 */
function buildVerifier(config, env, log, directory) {
  if (isDevAuthEnabled(env)) {
    log.warn(
      { event: 'auth.dev_mode_enabled' },
      'LOKUS_AUTH_MODE=dev — identities are NOT verified. Local development only.',
    );
    // A token that names no tenant stands in for an Identity Platform token
    // for the demo account, so it carries the memberships that account would
    // hold. Without this, screen 01 cannot list what to sign into.
    return createDevVerifier({ env, logger: log, demoMemberships: () => directory.demoMemberships() });
  }

  return createTokenVerifier(config.auth);
}

/** Without a report the Admin screen shows no gates rather than invented ones. */
const EMPTY_REPORT = Object.freeze({ generatedAt: null, cases: 0, gates: [] });
