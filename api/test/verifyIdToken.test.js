import { describe, expect, it } from 'vitest';

import { TEST_AUTH_CONFIG, createTestIssuer } from './helpers/tokens.js';

describe('verifyIdToken', () => {
  it('returns a principal with the tenant memberships from the token', async () => {
    // Arrange
    const issuer = await createTestIssuer();
    const token = await issuer.sign({
      roles: { 'nusa-retail': 'manager', 'dealer-arta-motor': 'admin' },
      tenantId: 'nusa-retail',
    });

    // Act
    const principal = await issuer.verify(token);

    // Assert
    expect(principal.userId).toBe('user-dwi');
    expect(principal.defaultTenantId).toBe('nusa-retail');
    expect([...principal.memberships.entries()]).toEqual([
      ['nusa-retail', 'manager'],
      ['dealer-arta-motor', 'admin'],
    ]);
  });

  it('throws when the bearer token is missing', async () => {
    const issuer = await createTestIssuer();

    await expect(issuer.verify(null)).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_TOKEN_MISSING',
    });
  });

  it('rejects a token minted for another project (wrong issuer)', async () => {
    const issuer = await createTestIssuer();
    const token = await issuer.sign({ issuer: 'https://securetoken.google.com/other-project' });

    await expect(issuer.verify(token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_TOKEN_INVALID',
    });
  });

  it('rejects a token whose audience is not this project', async () => {
    const issuer = await createTestIssuer();
    const token = await issuer.sign({ audience: 'some-other-app' });

    await expect(issuer.verify(token)).rejects.toMatchObject({ code: 'AUTH_TOKEN_INVALID' });
  });

  it('rejects an expired token', async () => {
    const issuer = await createTestIssuer();
    const hourAgo = Math.floor(Date.now() / 1000) - 3600;
    const token = await issuer.sign({ issuedAt: hourAgo, expiresIn: hourAgo + 60 });

    await expect(issuer.verify(token)).rejects.toMatchObject({ code: 'AUTH_TOKEN_INVALID' });
  });

  it('rejects a token signed by a different key', async () => {
    const issuer = await createTestIssuer();
    const impostor = await createTestIssuer();
    const token = await impostor.sign();

    await expect(issuer.verify(token)).rejects.toMatchObject({ code: 'AUTH_TOKEN_INVALID' });
  });

  it('rejects a token that carries no tenant membership at all', async () => {
    const issuer = await createTestIssuer();
    const token = await issuer.sign({ roles: null, tenantId: null });

    await expect(issuer.verify(token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTH_TENANT_CLAIM_MISSING',
    });
  });

  it('drops membership entries whose role is not one of the three known roles', async () => {
    // An unrecognised role must never be treated as a default — it is dropped.
    const issuer = await createTestIssuer();
    const token = await issuer.sign({
      roles: { 'nusa-retail': 'manager', 'klinik-sehat-prima': 'superuser' },
    });

    const principal = await issuer.verify(token);

    expect([...principal.memberships.keys()]).toEqual(['nusa-retail']);
  });

  it('refuses a default tenant the token grants no role for', async () => {
    const issuer = await createTestIssuer();
    const token = await issuer.sign({
      roles: { 'nusa-retail': 'viewer' },
      tenantId: 'klinik-sehat-prima',
    });

    const principal = await issuer.verify(token);

    expect(principal.defaultTenantId).toBeNull();
  });

  it('uses the configured claim names', async () => {
    expect(TEST_AUTH_CONFIG.tenantClaim).toBe('tenantId');
    expect(TEST_AUTH_CONFIG.rolesClaim).toBe('roles');
  });
});
