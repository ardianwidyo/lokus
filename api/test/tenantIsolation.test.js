import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ROLES } from '../src/auth/roles.js';
import { createSeededTenantDirectory } from '../src/repositories/tenantDirectory.js';
import { buildServer } from '../src/server.js';
import { TEST_AUTH_CONFIG, TEST_PROJECT_ID, createTestIssuer } from './helpers/tokens.js';

const CONFIG = {
  environment: 'test',
  region: 'asia-southeast2',
  projectId: TEST_PROJECT_ID,
  auth: TEST_AUTH_CONFIG,
};

describe('tenant isolation and role enforcement (AC-6.1, AC-6.3)', () => {
  let issuer;
  let fastify;

  beforeEach(async () => {
    issuer = await createTestIssuer();
    fastify = buildServer({
      config: CONFIG,
      verifyIdToken: issuer.verify,
      tenantDirectory: createSeededTenantDirectory(),
      logger: false,
    });

    // A route that exists only to exercise the gates the screens will use.
    fastify.post(
      '/v1/test/write',
      { preHandler: [fastify.authenticate, fastify.withTenant, fastify.requireRole(ROLES.MANAGER)] },
      async (request) => ({ tenantId: request.tenant.id, role: request.tenant.role }),
    );
    fastify.get(
      '/v1/test/admin',
      { preHandler: [fastify.authenticate, fastify.withTenant, fastify.requireRole(ROLES.ADMIN)] },
      async () => ({ ok: true }),
    );

    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  const call = async (path, { token, tenantId, method = 'GET' } = {}) =>
    fastify.inject({
      method,
      url: path,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'x-lokus-tenant': tenantId } : {}),
      },
    });

  it('serves the health probe without a token', async () => {
    const response = await fastify.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
  });

  it('rejects an unauthenticated request', async () => {
    const response = await call('/v1/session');

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('rejects a malformed authorization scheme', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/v1/session',
      headers: { authorization: 'Basic abc123' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('rejects any tenant-scoped request that names no tenant', async () => {
    const token = await issuer.sign({ roles: { 'nusa-retail': ROLES.MANAGER } });

    const response = await call('/v1/session/tenant', { token, method: 'POST' });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('TENANT_REQUIRED');
  });

  it('refuses a tenant the token grants no role for (AC-6.1)', async () => {
    const token = await issuer.sign({ roles: { 'nusa-retail': ROLES.MANAGER } });

    const response = await call('/v1/session/tenant', {
      token,
      tenantId: 'klinik-sehat-prima',
      method: 'POST',
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('TENANT_FORBIDDEN');
  });

  it('refuses a request whose header and query name different tenants', async () => {
    const token = await issuer.sign({
      roles: { 'nusa-retail': ROLES.MANAGER, 'dealer-arta-motor': ROLES.ADMIN },
    });

    const response = await fastify.inject({
      method: 'POST',
      url: '/v1/session/tenant?tenantId=dealer-arta-motor',
      headers: { authorization: `Bearer ${token}`, 'x-lokus-tenant': 'nusa-retail' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('TENANT_REQUIRED');
  });

  it('lists only the tenants the token grants, each with its role (AC-6.3)', async () => {
    const token = await issuer.sign({
      roles: { 'nusa-retail': ROLES.MANAGER, 'dealer-arta-motor': ROLES.ADMIN },
    });

    const response = await call('/v1/session', { token });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.tenants.map((tenant) => tenant.tenantId).sort()).toEqual([
      'dealer-arta-motor',
      'nusa-retail',
    ]);
    expect(body.tenants.find((t) => t.tenantId === 'nusa-retail').role).toBe(ROLES.MANAGER);
    expect(body.tenants.find((t) => t.tenantId === 'dealer-arta-motor').role).toBe(ROLES.ADMIN);
    // The third seeded tenant exists but is not this user's — it must not leak.
    expect(body.tenants.some((t) => t.tenantId === 'klinik-sehat-prima')).toBe(false);
  });

  it('marks the selected tenant as last opened', async () => {
    const token = await issuer.sign({ roles: { 'nusa-retail': ROLES.MANAGER } });

    const selected = await call('/v1/session/tenant', {
      token,
      tenantId: 'nusa-retail',
      method: 'POST',
    });
    const listed = await call('/v1/session', { token });

    expect(selected.json().tenant.lastOpenedAt).toEqual(expect.any(String));
    expect(listed.json().tenants[0].lastOpenedAt).toEqual(expect.any(String));
  });

  it('blocks a viewer from a manager-level route', async () => {
    const token = await issuer.sign({ roles: { 'nusa-retail': ROLES.VIEWER } });

    const response = await call('/v1/test/write', {
      token,
      tenantId: 'nusa-retail',
      method: 'POST',
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('ROLE_FORBIDDEN');
  });

  it('lets a manager through a manager-level route', async () => {
    const token = await issuer.sign({ roles: { 'nusa-retail': ROLES.MANAGER } });

    const response = await call('/v1/test/write', {
      token,
      tenantId: 'nusa-retail',
      method: 'POST',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ tenantId: 'nusa-retail', role: ROLES.MANAGER });
  });

  it('blocks a manager from an admin-level route but lets an admin through', async () => {
    const managerToken = await issuer.sign({ roles: { 'nusa-retail': ROLES.MANAGER } });
    const adminToken = await issuer.sign({ roles: { 'nusa-retail': ROLES.ADMIN } });

    const blocked = await call('/v1/test/admin', { token: managerToken, tenantId: 'nusa-retail' });
    const allowed = await call('/v1/test/admin', { token: adminToken, tenantId: 'nusa-retail' });

    expect(blocked.statusCode).toBe(403);
    expect(allowed.statusCode).toBe(200);
  });

  it('enforces the role the token carries, not one the client asserts', async () => {
    // A client that claims to be an admin in the body still gets its token role.
    const token = await issuer.sign({ roles: { 'nusa-retail': ROLES.VIEWER } });

    const response = await fastify.inject({
      method: 'GET',
      url: '/v1/test/admin',
      headers: { authorization: `Bearer ${token}`, 'x-lokus-tenant': 'nusa-retail' },
      payload: { role: 'admin' },
    });

    expect(response.statusCode).toBe(403);
  });
});
