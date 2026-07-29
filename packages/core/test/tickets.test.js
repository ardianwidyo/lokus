import { describe, expect, it } from 'vitest';

import { answerActions } from '../src/agents/answerActions.js';
import {
  SLA_DAYS,
  TICKET_STATUS,
  TICKET_STATUS_ORDER,
  TicketError,
  createMemoryTicketStore,
} from '../src/tickets/ticketStore.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';

const TENANT = 'nusa-retail';
const base = { title: 'Buka kasir kedua 17.00–20.00', sourceInsightId: 'run-1' };

describe('ticket store', () => {
  it('creates a ticket with an SLA due date', async () => {
    const store = createMemoryTicketStore({ now: () => new Date('2026-07-29T00:00:00Z') });

    const ticket = await store.create(TENANT, base);

    expect(ticket.id).toMatch(/^T-\d+$/);
    expect(ticket.status).toBe(TICKET_STATUS.BARU);
    expect(new Date(ticket.dueAt).getUTCDate()).toBe(3); // 29 Jul + 5 days
    expect(SLA_DAYS).toBe(5);
  });

  it('refuses a ticket with no link back to the insight that produced it', async () => {
    const store = createMemoryTicketStore();

    // Without this link a closed ticket can never prove what it was worth.
    await expect(store.create(TENANT, { title: 'Tanpa asal' })).rejects.toMatchObject({
      code: 'SOURCE_REQUIRED',
    });
    await expect(store.create(TENANT, { sourceInsightId: 'run-1' })).rejects.toBeInstanceOf(
      TicketError,
    );
  });

  it('resolves the outlet name so a card reads without a second lookup', async () => {
    const store = createMemoryTicketStore();

    const ticket = await store.create(TENANT, { ...base, outletId: 'BKS-02' });

    expect(ticket.outletName).toBe('Bekasi Timur');
  });

  it('stamps closedAt when a ticket moves to selesai', async () => {
    const store = createMemoryTicketStore();
    const ticket = await store.create(TENANT, base);

    const closed = await store.update(TENANT, ticket.id, { status: TICKET_STATUS.SELESAI });

    expect(closed.closedAt).toEqual(expect.any(String));
  });

  it('builds the four board columns in a fixed order', async () => {
    const store = createMemoryTicketStore();
    await store.create(TENANT, base);

    const board = await store.board(TENANT);

    expect(board.map((column) => column.status)).toEqual(TICKET_STATUS_ORDER);
    expect(board[0].tickets).toHaveLength(1);
  });

  it('measures close time against the SLA', async () => {
    const times = ['2026-07-01T00:00:00Z', '2026-07-04T00:00:00Z'];
    let call = 0;
    const store = createMemoryTicketStore({ now: () => new Date(times[Math.min(call++, 1)]) });

    const ticket = await store.create(TENANT, base);
    await store.update(TENANT, ticket.id, { status: TICKET_STATUS.SELESAI });

    expect(await store.closeTimeStats(TENANT)).toMatchObject({ closed: 1, averageDays: 3, slaDays: 5 });
  });

  it('reports no average when nothing is closed yet', async () => {
    const store = createMemoryTicketStore();
    await store.create(TENANT, base);

    expect((await store.closeTimeStats(TENANT)).averageDays).toBeNull();
  });

  it('scopes every read to the tenant and refuses without one', async () => {
    const store = createMemoryTicketStore();
    const ticket = await store.create(TENANT, base);

    expect(await store.get('klinik-sehat-prima', ticket.id)).toBeNull();
    expect(await store.list('klinik-sehat-prima')).toEqual([]);
    await expect(store.list()).rejects.toBeInstanceOf(TenantScopeError);
  });
});

describe('answerActions (AC-7.3)', () => {
  const run = {
    id: 'run-9',
    question: 'Kenapa rating Bekasi Timur turun?',
    outletId: 'BKS-02',
    refused: false,
    sources: [{ type: 'review', id: 'r1' }, { type: 'review', id: 'r2' }],
    findings: [{ agent: 'reputation', text: 'Tema terbesar adalah antrean-kasir: 31 keluhan.' }],
  };

  it('offers at least one action on every answer', () => {
    expect(answerActions(run).length).toBeGreaterThan(0);
  });

  it('derives actions from what the run found, not a fixed menu', () => {
    const withoutOutlet = answerActions({ ...run, outletId: null, sources: [] });

    expect(answerActions(run).map((a) => a.id)).toEqual([
      'create-ticket',
      'open-reviews',
      'show-on-map',
    ]);
    // No outlet and no reviews: neither of those actions would lead anywhere.
    expect(withoutOutlet.map((a) => a.id)).toEqual(['create-ticket']);
  });

  it('counts the reviews it would open', () => {
    expect(answerActions(run).find((a) => a.id === 'open-reviews').label).toBe('Lihat 2 review');
  });

  it('carries a ticket payload that links back to the run', () => {
    const ticket = answerActions(run).find((a) => a.id === 'create-ticket');

    expect(ticket.payload).toMatchObject({
      sourceInsightId: 'run-9',
      sourceKind: 'agent_run',
      outletId: 'BKS-02',
      owner: 'Dwi Kurnia',
    });
  });

  it('turns a refusal into a route for closing the gap', () => {
    const actions = answerActions({ ...run, refused: true });

    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe('report-gap');
  });

  it('returns nothing for no run at all', () => {
    expect(answerActions(null)).toEqual([]);
  });
});
