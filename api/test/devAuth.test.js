import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEV_TOKEN_PREFIX,
  assertDevAuthAllowed,
  createDevVerifier,
  isDevAuthEnabled,
} from '../src/auth/devPrincipal.js';
import { ROLES } from '../src/auth/roles.js';
import { buildServer } from '../src/server.js';
import { createServices } from '../src/services/index.js';
import { TEST_AUTH_CONFIG, TEST_PROJECT_ID } from './helpers/tokens.js';

const CONFIG = {
  environment: 'test',
  region: 'asia-southeast2',
  projectId: TEST_PROJECT_ID,
  auth: TEST_AUTH_CONFIG,
};

const DEV_ENV = { LOKUS_AUTH_MODE: 'dev', NODE_ENV: 'development' };

let fastify;

afterEach(async () => {
  await fastify?.close();
  fastify = undefined;
});

describe('dev auth mode is fenced', () => {
  it('is off unless explicitly enabled', () => {
    expect(isDevAuthEnabled({})).toBe(false);
    expect(isDevAuthEnabled({ LOKUS_AUTH_MODE: '' })).toBe(false);
    // A misspelling must not silently open the hole.
    expect(isDevAuthEnabled({ LOKUS_AUTH_MODE: 'development' })).toBe(false);
    expect(isDevAuthEnabled({ LOKUS_AUTH_MODE: 'DEV' })).toBe(false);
    expect(isDevAuthEnabled({ LOKUS_AUTH_MODE: 'dev' })).toBe(true);
  });

  it('refuses to exist in production', () => {
    const env = { LOKUS_AUTH_MODE: 'dev', NODE_ENV: 'production' };

    expect(() => assertDevAuthAllowed(env)).toThrow(/must never run in production/);
    expect(() => createDevVerifier({ env })).toThrow(/Refusing to start/);
  });

  it('stops the server from booting in production with the mode set', () => {
    // Not "logs a warning and continues": the process must not come up.
    expect(() =>
      buildServer({
        config: CONFIG,
        env: { LOKUS_AUTH_MODE: 'dev', NODE_ENV: 'production' },
        logger: false,
      }),
    ).toThrow(/production/);
  });

  it('logs every request it serves, so such a deployment cannot look normal', async () => {
    const logger = { warn: vi.fn() };
    const verify = createDevVerifier({ env: DEV_ENV, logger });

    await verify(`${DEV_TOKEN_PREFIX}dwi:nusa-retail:manager`);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.dev_mode' }),
      expect.stringMatching(/NOT verified/),
    );
  });
});

describe('dev token parsing', () => {
  const verify = createDevVerifier({ env: DEV_ENV });

  it('builds the same principal shape the real verifier returns', async () => {
    const principal = await verify('dev:dwi:nusa-retail:manager');

    expect(principal).toMatchObject({ userId: 'dwi', defaultTenantId: 'nusa-retail', devMode: true });
    expect([...principal.memberships.entries()]).toEqual([['nusa-retail', 'manager']]);
  });

  it('defaults to manager when the role is omitted', async () => {
    expect((await verify('dev:dwi:nusa-retail')).memberships.get('nusa-retail')).toBe(ROLES.MANAGER);
  });

  it.each([
    ['no token', null],
    ['a real-looking JWT', 'eyJhbGciOiJIUzI1NiJ9.e30.sig'],
    ['the prefix alone', 'dev:'],
    ['no tenant', 'dev:dwi'],
    ['an unknown role', 'dev:dwi:nusa-retail:superuser'],
  ])('rejects %s', async (_label, token) => {
    await expect(verify(token)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('does not accept a token shaped like a JWT, so nothing here can be mistaken for one', async () => {
    await expect(verify('Bearer eyJhbGci')).rejects.toMatchObject({ code: 'AUTH_TOKEN_INVALID' });
  });
});

describe('the console can reach the API end to end in dev mode', () => {
  const request = (method, url, token, tenantId, payload) =>
    fastify.inject({
      method,
      url,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'x-lokus-tenant': tenantId } : {}),
      },
      ...(payload ? { payload } : {}),
    });

  const boot = () => {
    fastify = buildServer({
      config: CONFIG,
      env: DEV_ENV,
      services: createServices({ evaluationReport: { generatedAt: null, cases: 0, gates: [] } }),
      logger: false,
    });
    return fastify.ready();
  };

  it('serves the session and the inbox with a dev token', async () => {
    await boot();

    const session = await request('GET', '/v1/session', 'dev:dwi:nusa-retail:manager');
    const inbox = await request('GET', '/v1/reviews', 'dev:dwi:nusa-retail:manager', 'nusa-retail');

    expect(session.statusCode).toBe(200);
    expect(session.json().tenants[0].tenantId).toBe('nusa-retail');
    expect(inbox.json().rows.length).toBeGreaterThan(0);
  });

  it('still enforces tenant isolation — dev mode weakens identity, not scoping', async () => {
    await boot();

    const response = await request(
      'GET',
      '/v1/reviews',
      'dev:dwi:nusa-retail:manager',
      'dealer-arta-motor',
    );

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('TENANT_FORBIDDEN');
  });

  it('still enforces roles — a dev viewer cannot send a reply', async () => {
    await boot();

    const response = await request(
      'POST',
      '/v1/reviews/rev-BKS-02-featured-1/reply',
      'dev:lina:nusa-retail:viewer',
      'nusa-retail',
    );

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ROLE_FORBIDDEN');
  });

  it('still rejects an anonymous caller', async () => {
    await boot();

    expect((await request('GET', '/v1/reviews', null, 'nusa-retail')).statusCode).toBe(401);
  });
});
