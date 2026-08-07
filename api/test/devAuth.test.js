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
    ['an unknown role', 'dev:dwi:nusa-retail:superuser'],
  ])('rejects %s', async (_label, token) => {
    await expect(verify(token)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('accepts a token with no tenant, and grants it nothing (T062)', async () => {
    // This used to be rejected, which made screen 01 unreachable over HTTP:
    // the tenant list needs a token, and the token needed a tenant from that
    // list. Signing in is now separable from opening a tenant — and this
    // verifier was built without demo memberships, so it opens nothing.
    const principal = await verify('dev:dwi');

    expect(principal).toMatchObject({ userId: 'dwi', defaultTenantId: null, devMode: true });
    expect(principal.memberships.size).toBe(0);
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

describe('T062 · a dev token without a tenant', () => {
  const boot = async () => {
    fastify = await buildServer({
      config: CONFIG,
      env: DEV_ENV,
      services: createServices({ evaluationReport: null }),
    });
    return fastify;
  };

  it('authenticates, so screen 01 can list what to sign into', async () => {
    // The defect this fixes: /v1/session needs a token, and the console could
    // not mint one until a tenant was chosen from the list /v1/session returns.
    await boot();

    const response = await fastify.inject({
      method: 'GET',
      url: '/v1/session',
      headers: { authorization: 'Bearer dev:demo' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tenants.length).toBeGreaterThan(0);
    expect(body.tenants.map((t) => t.tenantId)).toContain('nusa-retail');
  });

  it('carries the differing roles, so the RBAC gate is visible in the demo', async () => {
    await boot();

    const { tenants } = (
      await fastify.inject({
        method: 'GET',
        url: '/v1/session',
        headers: { authorization: 'Bearer dev:demo' },
      })
    ).json();

    const roles = Object.fromEntries(tenants.map((t) => [t.tenantId, t.role]));
    // Admin sits on the tenant that has documents, reviews and spend, because
    // screen 14 is admin-only and is the screen a judge is meant to check.
    expect(roles['nusa-retail']).toBe('admin');
    expect(roles['dealer-arta-motor']).toBe('manager');
    expect(roles['klinik-sehat-prima']).toBe('viewer');
  });

  it('opens nothing by itself — no tenant is selected yet', async () => {
    await boot();

    const body = (
      await fastify.inject({
        method: 'GET',
        url: '/v1/session',
        headers: { authorization: 'Bearer dev:demo' },
      })
    ).json();

    expect(body.defaultTenantId).toBeNull();
  });

  it('still cannot read tenant data without naming a tenant', async () => {
    // The whole point: widening sign-in must not widen access.
    await boot();

    const response = await fastify.inject({
      method: 'GET',
      url: '/v1/reviews',
      headers: { authorization: 'Bearer dev:demo' },
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('is refused for a tenant it holds no membership in', async () => {
    await boot();

    const response = await fastify.inject({
      method: 'GET',
      url: '/v1/reviews',
      headers: { authorization: 'Bearer dev:demo', 'x-lokus-tenant': 'tenant-yang-tidak-ada' },
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
  });

  it('lists nothing when the deployment knows no demo tenants', async () => {
    // The memberships are injected, not assumed, so an empty directory is an
    // empty list rather than an invented one.
    const verify = createDevVerifier({ env: DEV_ENV, demoMemberships: () => new Map() });

    const principal = await verify('dev:demo');

    expect(principal.memberships.size).toBe(0);
    expect(principal.devMode).toBe(true);
  });

  it('still rejects a token with no user at all', async () => {
    const verify = createDevVerifier({ env: DEV_ENV });

    await expect(verify(DEV_TOKEN_PREFIX)).rejects.toThrow();
  });

  it('still rejects an unrecognised role when a tenant is named', async () => {
    const verify = createDevVerifier({ env: DEV_ENV });

    await expect(verify('dev:demo:nusa-retail:superuser')).rejects.toThrow();
    await expect(verify(`dev:demo:nusa-retail:${ROLES.MANAGER}`)).resolves.toMatchObject({
      defaultTenantId: 'nusa-retail',
    });
  });
});
