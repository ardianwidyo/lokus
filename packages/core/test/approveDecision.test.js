import { describe, expect, it } from 'vitest';

import {
  DecisionApprovalError,
  NETWORK_OWNER,
  approveBriefingDecision,
  dueDateFor,
  ownerFor,
} from '../src/briefing/approveDecision.js';
import { SLA_DAYS, createMemoryTicketStore } from '../src/tickets/ticketStore.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';

const TENANT = 'nusa-retail';
const NOW = new Date('2026-07-29T00:00:00Z');

const branchDecision = {
  id: 'decision-theme-antrean-kasir',
  rank: 2,
  title: 'Antrean kasir memburuk di Bekasi Timur',
  outletId: 'BKS-02',
  theme: 'antrean-kasir',
};

const networkDecision = {
  id: 'decision-systemic',
  rank: 1,
  title: 'Antrean kasir adalah masalah sistemik, bukan lokal',
  outletId: null,
  theme: 'antrean-kasir',
};

const approve = (decision, overrides = {}) =>
  approveBriefingDecision({
    tenantId: TENANT,
    decision,
    approvedBy: 'manajer@nusaretail.co.id',
    role: 'manager',
    ticketStore: createMemoryTicketStore({ now: () => NOW }),
    now: () => NOW,
    ...overrides,
  });

describe('approving a briefing decision (AC-1.3)', () => {
  it('creates a ticket with an owner and a due date', async () => {
    const ticket = await approve(branchDecision);

    expect(ticket.id).toMatch(/^T-\d+$/);
    expect(ticket.owner).toBe('Dwi Kurnia');
    expect(ticket.dueAt).toEqual(expect.any(String));
  });

  it('gives the ticket to the branch manager, not to whoever clicked approve', async () => {
    // Who decided and who must act are different questions.
    const ticket = await approve(branchDecision, { approvedBy: 'direktur@nusaretail.co.id' });

    expect(ticket.owner).toBe('Dwi Kurnia');
    expect(ticket.createdBy).toBe('direktur@nusaretail.co.id');
  });

  it('routes a network-level finding to Ops Excellence', async () => {
    const ticket = await approve(networkDecision);

    expect(ticket.owner).toBe(NETWORK_OWNER);
    expect(ownerFor({ outletId: null })).toBe(NETWORK_OWNER);
  });

  it('gives the top-ranked decision a shorter clock than the standing SLA', async () => {
    const urgent = new Date(dueDateFor({ rank: 1 }, NOW));
    const standard = new Date(dueDateFor({ rank: 3 }, NOW));

    expect(urgent.getTime()).toBeLessThan(standard.getTime());
    expect(Math.round((standard - NOW) / 86400000)).toBe(SLA_DAYS);
  });

  it('links the ticket back to the decision that produced it', async () => {
    const ticket = await approve(branchDecision);

    expect(ticket.sourceInsightId).toBe(branchDecision.id);
    expect(ticket.sourceKind).toBe('briefing_decision');
  });

  it('refuses a second approval of the same decision', async () => {
    // Two tickets for one finding would double-count its impact later.
    const ticketStore = createMemoryTicketStore({ now: () => NOW });
    await approve(branchDecision, { ticketStore });

    await expect(approve(branchDecision, { ticketStore })).rejects.toMatchObject({
      code: 'ALREADY_APPROVED',
    });
  });

  it('names the existing ticket when it refuses', async () => {
    const ticketStore = createMemoryTicketStore({ now: () => NOW });
    const first = await approve(branchDecision, { ticketStore });

    await expect(approve(branchDecision, { ticketStore })).rejects.toThrow(
      new RegExp(first.id),
    );
  });

  it('refuses approval from a viewer (AC-6.3)', async () => {
    await expect(approve(branchDecision, { role: 'viewer' })).rejects.toMatchObject({
      code: 'ROLE_FORBIDDEN',
    });
  });

  it('refuses an approval with no named approver', async () => {
    await expect(approve(branchDecision, { approvedBy: '' })).rejects.toMatchObject({
      code: 'APPROVER_REQUIRED',
    });
  });

  it('refuses an unrecognised decision', async () => {
    await expect(approve({})).rejects.toBeInstanceOf(DecisionApprovalError);
    await expect(approve(null)).rejects.toMatchObject({ code: 'DECISION_REQUIRED' });
  });

  it('refuses without a tenant id', async () => {
    await expect(
      approveBriefingDecision({
        decision: branchDecision,
        approvedBy: 'x',
        role: 'manager',
        ticketStore: createMemoryTicketStore(),
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('keeps one tenant\'s approval invisible to another', async () => {
    const ticketStore = createMemoryTicketStore({ now: () => NOW });
    await approve(branchDecision, { ticketStore });

    // Same decision id, different tenant: no clash, and no leak.
    const other = await approveBriefingDecision({
      tenantId: 'dealer-arta-motor',
      decision: branchDecision,
      approvedBy: 'admin@arta.co.id',
      role: 'admin',
      ticketStore,
      now: () => NOW,
    });

    expect(other.tenantId).toBe('dealer-arta-motor');
    expect(await ticketStore.list('dealer-arta-motor')).toHaveLength(1);
  });
});
