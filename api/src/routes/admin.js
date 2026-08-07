import { ROLES } from '../auth/roles.js';
import { badRequest, forbidden } from '../lib/errors.js';

/**
 * Screen 14. Admin-only: per-tenant cost and usage are exactly the sort of
 * thing a viewer or a branch manager has no business reading (AC-6.2).
 */
export function adminRoutes(fastify, { admin, reasoning = null }) {
  const adminOnly = {
    preHandler: [fastify.authenticate, fastify.withTenant, fastify.requireRole(ROLES.ADMIN)],
  };

  fastify.get('/v1/admin/overview', adminOnly, async (request) =>
    admin.overview(request.tenant.id, { locale: request.locale }),
  );

  if (!reasoning) return;

  /**
   * Which reasoning paths this process could take, and which one it is taking.
   *
   * No credential is in the response — not the project id, not the key, not a
   * prefix of the key. A prefix is enough to confirm a guess, and this payload
   * is read by a browser. What a reader gets is whether a path is configured
   * and, when it is not, which variable is missing.
   */
  fastify.get('/v1/admin/reasoning', adminOnly, async () => ({
    active: reasoning.path,
    mutable: reasoning.mutable,
    options: reasoning.options(),
  }));

  fastify.post('/v1/admin/reasoning', adminOnly, async (request) => {
    const next = String(request.body?.path ?? '');

    try {
      reasoning.select(next);
    } catch (error) {
      // A locked switch is a permission answer, not a validation one: the
      // request was well formed and the operator may not do it here.
      if (error?.code === 'REASONING_IMMUTABLE') throw forbidden(error.code, error.message);
      throw badRequest(error?.code ?? 'REASONING_REJECTED', error?.message ?? 'Jalur ditolak');
    }

    request.log.warn(
      // Worth a warning rather than an info: this changes how every answer on
      // this process is produced, and what it costs.
      { event: 'reasoning.path_changed', path: reasoning.path, by: request.principal?.userId ?? null },
      `jalur penalaran diubah ke ${reasoning.path}`,
    );

    return { active: reasoning.path, mutable: reasoning.mutable, options: reasoning.options() };
  });
}
