import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';
import { buildServer } from '../src/server.js';
import { createServices } from '../src/services/index.js';
import { TEST_AUTH_CONFIG, TEST_PROJECT_ID } from './helpers/tokens.js';

const CONSOLE_ORIGIN = 'http://localhost:5173';
const EMPTY_REPORT = { generatedAt: null, cases: 0, gates: [] };

let fastify;

afterEach(async () => {
  await fastify?.close();
  fastify = undefined;
});

const boot = async (allowedOrigins) => {
  fastify = buildServer({
    config: { environment: 'test', region: 'asia-southeast2', projectId: TEST_PROJECT_ID, auth: TEST_AUTH_CONFIG, allowedOrigins },
    verifyIdToken: async () => {
      throw Object.assign(new Error('unused'), { statusCode: 401 });
    },
    services: createServices({ evaluationReport: EMPTY_REPORT }),
    env: {},
    logger: false,
  });
  await fastify.ready();
  return fastify;
};

const preflight = (origin) =>
  fastify.inject({
    method: 'OPTIONS',
    url: '/v1/session',
    headers: {
      origin,
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization,x-lokus-tenant',
    },
  });

/**
 * The console is served from a different origin than the API, so without this
 * the browser blocks every request — and every unit test would still pass,
 * because inject() is not a browser. That is exactly how this was missed until
 * the two halves were run together.
 */
describe('CORS', () => {
  it('answers the preflight for an allowed origin', async () => {
    await boot([CONSOLE_ORIGIN]);

    const response = await preflight(CONSOLE_ORIGIN);

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(CONSOLE_ORIGIN);
  });

  it('allows exactly the headers the client sends', async () => {
    await boot([CONSOLE_ORIGIN]);

    const allowed = (await preflight(CONSOLE_ORIGIN)).headers['access-control-allow-headers'];

    for (const header of ['authorization', 'content-type', 'x-lokus-tenant']) {
      expect(allowed.toLowerCase()).toContain(header);
    }
  });

  it('does not grant an origin that is not on the list', async () => {
    await boot([CONSOLE_ORIGIN]);

    const response = await fastify.inject({
      method: 'GET',
      url: '/healthz',
      headers: { origin: 'https://jahat.example' },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('never answers with a wildcard, since every request carries a token', async () => {
    await boot([CONSOLE_ORIGIN]);

    const response = await preflight(CONSOLE_ORIGIN);

    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('permits no cross-origin caller when the allowlist is empty', async () => {
    // Fail closed: a same-origin deployment needs nothing, and a
    // misconfigured one should not quietly become open.
    await boot([]);

    const response = await fastify.inject({
      method: 'GET',
      url: '/healthz',
      headers: { origin: CONSOLE_ORIGIN },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('reads the allowlist from the environment, trimmed and split', () => {
    const config = loadConfig({
      GOOGLE_CLOUD_PROJECT: 'demo',
      LOKUS_ALLOWED_ORIGINS: ' http://localhost:5173 , https://console.example ,, ',
    });

    expect(config.allowedOrigins).toEqual(['http://localhost:5173', 'https://console.example']);
  });

  it('defaults to an empty allowlist when the variable is unset', () => {
    expect(loadConfig({ GOOGLE_CLOUD_PROJECT: 'demo' }).allowedOrigins).toEqual([]);
  });
});
