import { ERROR_CODES, badRequest, forbidden, unauthorized } from '../lib/errors.js';
import { satisfies } from '../auth/roles.js';

const TENANT_HEADER = 'x-lokus-tenant';

/**
 * Adds the three auth decorators to the instance. Called directly rather than
 * through `register` so the decorators land on the root scope and every route
 * registered afterwards can see them, without pulling in fastify-plugin.
 *
 *   authenticate   verifies the Identity Platform token → request.principal
 *   withTenant     resolves and authorises the tenant   → request.tenant
 *   requireRole    role gate, server-side (AC-6.3)
 */
export function registerAuth(fastify, { verifyIdToken }) {
  fastify.decorateRequest('principal', null);
  fastify.decorateRequest('tenant', null);

  fastify.decorate('authenticate', async function authenticate(request) {
    request.principal = await verifyIdToken(readBearerToken(request));
  });

  fastify.decorate('withTenant', async function withTenant(request) {
    const principal = request.principal;
    if (!principal) {
      // A route that asks for a tenant without authenticating first is a wiring
      // bug; fail closed rather than reading the header of an unknown caller.
      throw unauthorized(ERROR_CODES.AUTH_TOKEN_MISSING, 'Authentication must run before tenant resolution');
    }

    const tenantId = resolveRequestedTenantId(request);
    if (!tenantId) {
      throw badRequest(ERROR_CODES.TENANT_REQUIRED, `Header ${TENANT_HEADER} is required`);
    }

    const role = principal.memberships.get(tenantId);
    if (!role) {
      // AC-6.1: no cross-tenant data is ever returned. The response is the same
      // whether the tenant exists or not, so it cannot be used to enumerate.
      throw forbidden(ERROR_CODES.TENANT_FORBIDDEN, 'No membership for the requested tenant');
    }

    request.tenant = { id: tenantId, role };
    // Constitution IV: every log line carries the tenant id.
    request.log = request.log.child({ tenantId, userId: principal.userId });
  });

  fastify.decorate('requireRole', function requireRole(minimumRole) {
    return async function roleGate(request) {
      if (!request.tenant) {
        throw unauthorized(ERROR_CODES.TENANT_REQUIRED, 'Tenant must be resolved before the role gate');
      }
      if (!satisfies(request.tenant.role, minimumRole)) {
        throw forbidden(
          ERROR_CODES.ROLE_FORBIDDEN,
          `Role ${request.tenant.role} is below the required ${minimumRole}`,
        );
      }
    };
  });
}

function readBearerToken(request) {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return null;

  const [scheme, token] = header.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

/**
 * A tenant may be named by header, route param, or query string. When more
 * than one is present they must agree — a mismatch is a caller bug or an
 * attempt to slip a second tenant past the check, and both get rejected.
 */
function resolveRequestedTenantId(request) {
  const candidates = [
    request.headers[TENANT_HEADER],
    request.params?.tenantId,
    request.query?.tenantId,
  ]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .map((value) => value.trim());

  if (candidates.length === 0) return null;

  const [first] = candidates;
  if (candidates.some((value) => value !== first)) {
    throw badRequest(ERROR_CODES.TENANT_REQUIRED, 'Conflicting tenant ids in the request');
  }
  return first;
}

export { TENANT_HEADER };
