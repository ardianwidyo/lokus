import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';

import { createTokenVerifier } from '../../src/auth/verifyIdToken.js';

export const TEST_PROJECT_ID = 'lokus-test';

export const TEST_AUTH_CONFIG = Object.freeze({
  issuer: `https://securetoken.google.com/${TEST_PROJECT_ID}`,
  audience: TEST_PROJECT_ID,
  jwksUri: 'https://example.invalid/jwks',
  tenantClaim: 'tenantId',
  rolesClaim: 'roles',
  clockToleranceSeconds: 5,
});

/**
 * Signs real RS256 tokens against a locally generated key pair, so the tests
 * exercise the same `jwtVerify` path production uses instead of stubbing it.
 */
export async function createTestIssuer(authConfig = TEST_AUTH_CONFIG) {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const keySet = createLocalJWKSet({ keys: [jwk] });

  async function sign({
    sub = 'user-dwi',
    email = 'dwi@nusaretail.co.id',
    name = 'Dwi Kurnia',
    roles = { 'nusa-retail': 'manager' },
    tenantId = 'nusa-retail',
    issuer = authConfig.issuer,
    audience = authConfig.audience,
    expiresIn = '1h',
    issuedAt = Math.floor(Date.now() / 1000),
    extraClaims = {},
  } = {}) {
    // `null` means "omit this claim entirely"; `undefined` would just fall back
    // to the default above and hide the case under test.
    const payload = { email, name, ...extraClaims };
    if (roles !== null) payload[authConfig.rolesClaim] = roles;
    if (tenantId !== null) payload[authConfig.tenantClaim] = tenantId;

    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject(sub)
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresIn)
      .sign(privateKey);
  }

  return {
    sign,
    keySet,
    verify: createTokenVerifier(authConfig, { keySet }),
  };
}
