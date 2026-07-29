import { ROLES } from '../auth/roles.js';
import { notFound } from '../lib/errors.js';

/** Briefing Pagi and the action board — screens 02 and 13. */
export function briefingRoutes(fastify, { briefing, tickets }) {
  const read = { preHandler: [fastify.authenticate, fastify.withTenant] };
  const write = {
    preHandler: [fastify.authenticate, fastify.withTenant, fastify.requireRole(ROLES.MANAGER)],
  };

  fastify.get('/v1/briefing', read, async (request) => briefing.briefing(request.tenant.id));

  fastify.post('/v1/briefing/decisions/:decisionId/approve', write, async (request) => {
    const { principal, tenant } = request;

    const current = await briefing.briefing(tenant.id);
    const decision = current.decisions.find((item) => item.id === request.params.decisionId);
    if (!decision) throw notFound('Decision not found');

    const ticket = await briefing.approveDecision(tenant.id, decision, {
      approvedBy: principal.email ?? principal.userId,
      role: tenant.role,
    });

    request.log.info(
      { event: 'briefing.decision_approved', decisionId: decision.id, ticketId: ticket.id },
      'briefing decision approved',
    );
    return { ticket };
  });

  fastify.get('/v1/tickets', read, async (request) => {
    const [board, stats] = await Promise.all([
      tickets.board(request.tenant.id),
      tickets.closeTimeStats(request.tenant.id),
    ]);

    return { board, stats };
  });

  fastify.post('/v1/tickets', write, async (request) => {
    const { principal, tenant } = request;
    const body = request.body ?? {};

    const ticket = await tickets.create(tenant.id, {
      title: body.title,
      outletId: body.outletId ?? null,
      owner: body.owner ?? null,
      theme: body.theme ?? null,
      sourceInsightId: body.sourceInsightId,
      sourceKind: body.sourceKind ?? 'agent_run',
      createdBy: principal.email ?? principal.userId,
    });

    request.log.info({ event: 'ticket.created', ticketId: ticket.id }, 'ticket created');
    return { ticket };
  });
}
