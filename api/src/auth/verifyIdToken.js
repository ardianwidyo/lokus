import { createRemoteJWKSet, jwtVerify } from 'jose';

import { ERROR_CODES, unauthorized } from '../lib/errors.js';
import { isRole } from './roles.js';

/**
 * Verifies an Identity Platform ID token and extracts the tenant claims.
 *
 * The verifier is created once per process: `createRemoteJWKSet` caches and
 * rotates Google's signing keys itself, so per-request work is a signature
 * check, not a network call.
 *
 * `keySet` is injectable so tests can verify against a locally generated key
 * pair instead of reaching Google.
 */
export function createTokenVerifier(authConfig, { keySet } = {}) {
  const jwks = keySet ?? createRemoteJWKSet(new URL(authConfig.jwksUri));

  return async function verifyIdToken(token) {
    if (!token) {
      throw unauthorized(ERROR_CODES.AUTH_TOKEN_MISSING, 'Bearer token is required');
    }

    let payload;
    try {
      ({ payload } = await jwtVerify(token, jwks, {
        issuer: authConfig.issuer,
        audience: authConfig.audience,
        clockTolerance: authConfig.clockToleranceSeconds,
      }));
    } catch {
      // The reason a token failed (expired, wrong audience, bad signature) is
      // logged upstream but never returned: it tells an attacker what to fix.
      throw unauthorized(ERROR_CODES.AUTH_TOKEN_INVALID, 'Token could not be verified');
    }

    return toPrincipal(payload, authConfig);
  };
}

/**
 * Shapes a verified payload into the principal the rest of the API uses.
 * `memberships` maps tenant id → role and is the single source of truth for
 * what this user may see; a request for any tenant outside it is refused.
 */
export function toPrincipal(payload, authConfig) {
  const memberships = readMemberships(payload[authConfig.rolesClaim]);

  if (memberships.size === 0) {
    throw unauthorized(
      ERROR_CODES.AUTH_TENANT_CLAIM_MISSING,
      'Token carries no tenant membership',
    );
  }

  const defaultTenantId = normaliseTenantId(payload[authConfig.tenantClaim]);

  return {
    userId: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    name: typeof payload.name === 'string' ? payload.name : null,
    // Only a tenant the token actually grants can be the default.
    defaultTenantId: memberships.has(defaultTenantId) ? defaultTenantId : null,
    memberships,
    issuedAt: payload.iat ?? null,
    expiresAt: payload.exp ?? null,
  };
}

/**
 * Accepts `{ "tenant-a": "admin" }`. Entries with an unknown role are dropped
 * rather than defaulted — an unrecognised role must never widen access.
 */
function readMemberships(claim) {
  const memberships = new Map();
  if (!claim || typeof claim !== 'object' || Array.isArray(claim)) return memberships;

  for (const [tenantId, role] of Object.entries(claim)) {
    const id = normaliseTenantId(tenantId);
    if (id && isRole(role)) memberships.set(id, role);
  }
  return memberships;
}

function normaliseTenantId(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}
