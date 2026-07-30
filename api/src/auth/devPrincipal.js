import { ERROR_CODES, unauthorized } from '../lib/errors.js';
import { ROLES, isRole } from './roles.js';

/**
 * Local development authentication.
 *
 * Recorded in plan.md: Identity Platform is not provisioned for the pilot
 * tenant yet (spec.md Q1), and without this the console cannot talk to its own
 * API at all — leaving the auth, tenant and RBAC layers tested but never
 * exercised end to end.
 *
 * This is a deliberate hole in authentication, so it is fenced accordingly:
 *
 *   1. `createDevVerifier` throws if NODE_ENV is production. The server then
 *      refuses to boot rather than starting with the hole open.
 *   2. It is opt-in: nothing selects it unless LOKUS_AUTH_MODE is exactly
 *      "dev". A missing or misspelled value gets real token verification.
 *   3. Every request served under it is logged as such, so a deployment
 *      running this way cannot look like a normal one in the logs.
 *
 * The token format is `dev:<userId>:<tenantId>:<role>` — deliberately not a
 * JWT, so nothing produced here could ever be mistaken for a real credential.
 *
 * `dev:<userId>` alone is also valid, and screen 01 depends on it. The tenant
 * list comes from an authenticated route, so a token that requires a tenant
 * cannot be minted until a tenant has been chosen from the list that token is
 * needed to read. A tenant-less token carries the memberships the identity
 * provider would carry for the demo account instead; standing in for that
 * provider is the point of this mode. Tenant scoping is unaffected — every
 * tenant-scoped route still checks the header against these memberships.
 */

export const DEV_TOKEN_PREFIX = 'dev:';

export function isDevAuthEnabled(env = process.env) {
  return env.LOKUS_AUTH_MODE === 'dev';
}

export function assertDevAuthAllowed(env = process.env) {
  if (!isDevAuthEnabled(env)) return false;

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'LOKUS_AUTH_MODE=dev is set while NODE_ENV=production. Refusing to start: ' +
        'this mode accepts unverified identities and must never run in production.',
    );
  }

  return true;
}

/**
 * Builds a principal straight from the token string. Same shape as the real
 * verifier returns, so every downstream check — membership, role, tenant
 * scoping — behaves identically and is genuinely exercised.
 */
export function createDevVerifier({
  env = process.env,
  logger = null,
  // What a tenant-less token is a member of. Injected rather than imported so
  // the verifier does not reach into the tenant directory, and so a test can
  // hand it an empty set and watch screen 01 legitimately show nothing.
  demoMemberships = () => new Map(),
} = {}) {
  assertDevAuthAllowed(env);

  return async function verifyDevToken(token) {
    if (!token) {
      throw unauthorized(ERROR_CODES.AUTH_TOKEN_MISSING, 'Bearer token is required');
    }
    if (!token.startsWith(DEV_TOKEN_PREFIX)) {
      throw unauthorized(ERROR_CODES.AUTH_TOKEN_INVALID, 'Token could not be verified');
    }

    const [, userId, tenantId = '', role = ROLES.MANAGER] = token.split(':');

    if (!userId) {
      throw unauthorized(ERROR_CODES.AUTH_TOKEN_INVALID, 'Token could not be verified');
    }

    // No tenant named: the user is signing in and has not chosen one yet.
    if (!tenantId) {
      const memberships = new Map(demoMemberships());

      logger?.warn?.(
        { event: 'auth.dev_mode', userId, tenantId: null, tenants: memberships.size },
        'request authenticated in dev mode — identity is NOT verified',
      );

      return {
        userId,
        email: `${userId}@dev.local`,
        name: userId,
        // Nothing is open yet; the console asks for a tenant explicitly.
        defaultTenantId: null,
        memberships,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: null,
        devMode: true,
      };
    }

    if (!isRole(role)) {
      // An unrecognised role must never widen access, dev mode included.
      throw unauthorized(ERROR_CODES.AUTH_TOKEN_INVALID, 'Token could not be verified');
    }

    logger?.warn?.(
      { event: 'auth.dev_mode', userId, tenantId, role },
      'request authenticated in dev mode — identity is NOT verified',
    );

    return {
      userId,
      email: `${userId}@dev.local`,
      name: userId,
      defaultTenantId: tenantId,
      memberships: new Map([[tenantId, role]]),
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: null,
      devMode: true,
    };
  };
}
