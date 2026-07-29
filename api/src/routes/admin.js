import { ROLES } from '../auth/roles.js';

/**
 * Screen 14. Admin-only: per-tenant cost and usage are exactly the sort of
 * thing a viewer or a branch manager has no business reading (AC-6.2).
 */
export function adminRoutes(fastify, { admin }) {
  fastify.get(
    '/v1/admin/overview',
    {
      preHandler: [fastify.authenticate, fastify.withTenant, fastify.requireRole(ROLES.ADMIN)],
    },
    async (request) => admin.overview(request.tenant.id),
  );
}
