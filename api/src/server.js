import Fastify from 'fastify';

import { createTokenVerifier } from './auth/verifyIdToken.js';
import { HttpError } from './lib/errors.js';
import { registerAuth } from './plugins/auth.js';
import { createSeededTenantDirectory } from './repositories/tenantDirectory.js';
import { healthRoutes } from './routes/health.js';
import { sessionRoutes } from './routes/session.js';

/**
 * Builds the server without listening, so tests can drive it through
 * `fastify.inject` and no port is bound during CI.
 *
 * `verifyIdToken` and `tenantDirectory` are injectable: tests substitute a
 * locally signed key set and a fixed clock, production gets Google's JWKS.
 */
export function buildServer({ config, verifyIdToken, tenantDirectory, logger } = {}) {
  const fastify = Fastify({
    logger: logger ?? { level: process.env.LOG_LEVEL ?? 'info' },
    trustProxy: true,
  });

  const verifier = verifyIdToken ?? createTokenVerifier(config.auth);
  const directory = tenantDirectory ?? createSeededTenantDirectory();

  registerAuth(fastify, { verifyIdToken: verifier });

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      request.log.warn(
        { code: error.code, statusCode: error.statusCode, tenantId: request.tenant?.id ?? null },
        'request rejected',
      );
      return reply.status(error.statusCode).send(error.toJSON());
    }

    request.log.error({ err: error, tenantId: request.tenant?.id ?? null }, 'unhandled error');
    return reply
      .status(error.statusCode && error.statusCode < 500 ? error.statusCode : 500)
      .send({ error: { code: 'INTERNAL', message: 'Request failed' } });
  });

  healthRoutes(fastify, { config });
  sessionRoutes(fastify, { tenantDirectory: directory });

  return fastify;
}
