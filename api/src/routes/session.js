import { notFound } from '../lib/errors.js';

/**
 * Screen 01 "Masuk & pilih tenant" reads these two routes.
 *
 * AC-6.3: the role travels with every tenant in the list, and the same role is
 * what the server enforces later — the client is told, not trusted.
 */
export function sessionRoutes(fastify, { tenantDirectory }) {
  fastify.get(
    '/v1/session',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const { principal } = request;
      return {
        user: {
          userId: principal.userId,
          email: principal.email,
          name: principal.name,
        },
        defaultTenantId: principal.defaultTenantId,
        tenants: tenantDirectory.listForPrincipal(principal).map(toTenantView),
      };
    },
  );

  // Selecting a tenant records "terakhir dibuka" and hands back the role the
  // client must render. The client clears its cache on the response (screen 01
  // behaviour note); no server-side cache is shared across tenants.
  fastify.post(
    '/v1/session/tenant',
    { preHandler: [fastify.authenticate, fastify.withTenant] },
    async (request) => {
      const { principal, tenant } = request;

      const record = tenantDirectory.get(tenant.id);
      if (!record) throw notFound('Tenant not found');

      const lastOpenedAt = tenantDirectory.markOpened(principal, tenant.id);
      request.log.info({ event: 'tenant.selected' }, 'tenant selected');

      return { tenant: toTenantView({ ...record, role: tenant.role, lastOpenedAt }) };
    },
  );
}

function toTenantView(tenant) {
  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    segment: tenant.segment,
    outletCount: tenant.outletCount,
    area: tenant.area,
    plan: tenant.plan,
    trialDaysLeft: tenant.trialDaysLeft,
    role: tenant.role,
    lastOpenedAt: tenant.lastOpenedAt,
  };
}
