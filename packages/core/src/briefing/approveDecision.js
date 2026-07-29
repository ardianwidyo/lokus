import { findOutlet } from '../domain/outlets.js';
import { assertTenant } from '../lib/tenantScope.js';
import { SLA_DAYS, TicketError } from '../tickets/ticketStore.js';

/**
 * AC-1.3: approving a briefing item creates a ticket with an owner and a due
 * date.
 *
 * "An owner" means a named person who can actually do the work — the branch
 * manager for a branch-level finding, the SOP owner for a network-level one —
 * not whoever happened to click approve. The approver is recorded separately,
 * because who decided and who must act are different questions.
 */

/** Where a decision goes when it is not about one branch. */
export const NETWORK_OWNER = 'Ops Excellence';

export class DecisionApprovalError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DecisionApprovalError';
    this.code = code;
  }
}

const APPROVER_ROLES = new Set(['admin', 'manager']);

export function ownerFor(decision) {
  const outlet = decision.outletId ? findOutlet(decision.outletId) : null;
  if (outlet?.manager) return outlet.manager;

  // A systemic finding cannot be owned by one branch manager: fixing it means
  // changing the network SOP.
  return NETWORK_OWNER;
}

/** Urgent findings get a shorter clock than the standing SLA. */
export function dueDateFor(decision, now) {
  const days = decision.rank === 1 ? Math.ceil(SLA_DAYS / 2) : SLA_DAYS;
  return new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();
}

export async function approveBriefingDecision({
  tenantId,
  decision,
  approvedBy,
  role,
  ticketStore,
  now = () => new Date(),
}) {
  assertTenant(tenantId);

  if (!decision?.id) {
    throw new DecisionApprovalError('DECISION_REQUIRED', 'Keputusan tidak dikenali');
  }
  if (!approvedBy) {
    throw new DecisionApprovalError('APPROVER_REQUIRED', 'Persetujuan harus mencantumkan identitas');
  }
  if (!APPROVER_ROLES.has(role)) {
    throw new DecisionApprovalError('ROLE_FORBIDDEN', `Peran ${role} tidak boleh menyetujui keputusan`);
  }

  // Approving twice would create a second ticket for the same finding and
  // double-count its impact later.
  const existing = (await ticketStore.list(tenantId)).find(
    (ticket) => ticket.sourceInsightId === decision.id,
  );
  if (existing) {
    throw new DecisionApprovalError(
      'ALREADY_APPROVED',
      `Keputusan ini sudah disetujui dan menjadi tiket ${existing.id}`,
    );
  }

  try {
    return await ticketStore.create(tenantId, {
      title: decision.title,
      outletId: decision.outletId ?? null,
      owner: ownerFor(decision),
      theme: decision.theme ?? null,
      sourceInsightId: decision.id,
      sourceKind: 'briefing_decision',
      createdBy: approvedBy,
      dueAt: dueDateFor(decision, now()),
    });
  } catch (error) {
    if (error instanceof TicketError) {
      throw new DecisionApprovalError(error.code, error.message);
    }
    throw error;
  }
}
