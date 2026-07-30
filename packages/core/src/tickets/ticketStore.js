import { findOutlet } from '../domain/outlets.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { t } from '../i18n/index.js';
import { assertTenant, scopeToTenant } from '../lib/tenantScope.js';

/**
 * Tickets — how an insight becomes work that actually gets done.
 *
 * Every ticket keeps a link back to the insight that produced it
 * (`sourceInsightId`, plus the agent run or briefing item it came from). That
 * link is what lets LOKUS prove its value with numbers later instead of
 * anecdotes, and it is why a ticket cannot be created without one.
 */

export const TICKET_STATUS = Object.freeze({
  BARU: 'baru',
  DIKERJAKAN: 'dikerjakan',
  MENUNGGU: 'menunggu',
  SELESAI: 'selesai',
});

export const TICKET_STATUS_ORDER = Object.freeze([
  TICKET_STATUS.BARU,
  TICKET_STATUS.DIKERJAKAN,
  TICKET_STATUS.MENUNGGU,
  TICKET_STATUS.SELESAI,
]);

/**
 * The status *ids* stay Indonesian in both locales, because they are stored
 * values: a ticket written `status: 'selesai'` by yesterday's build must still
 * read as done tomorrow, and a status id that changed with the reader's language
 * would make the board's own filters locale-dependent. The column headings are
 * what a reader sees, and those come from the dictionary.
 */
export function ticketStatusLabels(locale = DEFAULT_LOCALE) {
  return Object.fromEntries(
    TICKET_STATUS_ORDER.map((status) => [status, t(locale, `ticketStatus.${status}`)]),
  );
}

export const TICKET_STATUS_LABEL = Object.freeze(ticketStatusLabels(DEFAULT_LOCALE));

/** Default SLA from spec.md success metrics: close within 5 days. */
export const SLA_DAYS = 5;

export class TicketError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TicketError';
    this.code = code;
  }
}

export function createMemoryTicketStore({ seed = [], now = () => new Date() } = {}) {
  const tickets = new Map();
  let sequence = 100;

  for (const ticket of seed) {
    tickets.set(`${ticket.tenantId}:${ticket.id}`, { ...ticket });
    const numeric = Number(String(ticket.id).replace(/\D/g, ''));
    if (Number.isFinite(numeric)) sequence = Math.max(sequence, numeric);
  }

  const key = (tenantId, id) => `${tenantId}:${id}`;

  async function create(tenantId, input) {
    assertTenant(tenantId);

    if (!input.title) throw new TicketError('TITLE_REQUIRED', 'Tiket wajib punya judul');
    // No orphan tickets: a ticket with no traceable origin cannot later prove
    // what it was worth.
    if (!input.sourceInsightId) {
      throw new TicketError('SOURCE_REQUIRED', 'Tiket wajib menautkan insight asalnya');
    }

    const createdAt = now();
    const dueAt =
      input.dueAt ?? new Date(createdAt.getTime() + SLA_DAYS * 24 * 3600 * 1000).toISOString();

    const ticket = {
      id: `T-${(sequence += 1)}`,
      tenantId,
      title: input.title,
      outletId: input.outletId ?? null,
      outletName: input.outletId ? (findOutlet(input.outletId)?.name ?? null) : null,
      owner: input.owner ?? null,
      status: input.status ?? TICKET_STATUS.BARU,
      theme: input.theme ?? null,
      sourceInsightId: input.sourceInsightId,
      sourceKind: input.sourceKind ?? 'agent_run',
      createdBy: input.createdBy ?? 'agent',
      // Who raised it, as a value rather than as something to be inferred from
      // the display name. Screen 13's "from an agent" filter used to test
      // `createdBy.startsWith('Agen')`, which stops being true the moment the
      // agent has an English name.
      createdByKind: input.createdByKind ?? 'agent',
      createdAt: createdAt.toISOString(),
      dueAt,
      closedAt: null,
      impact: null,
    };

    tickets.set(key(tenantId, ticket.id), ticket);
    return { ...ticket };
  }

  async function list(tenantId, { status = null } = {}) {
    assertTenant(tenantId);
    const rows = scopeToTenant(tenantId, [...tickets.values()]);
    return (status ? rows.filter((ticket) => ticket.status === status) : rows).map((t) => ({ ...t }));
  }

  async function get(tenantId, id) {
    assertTenant(tenantId);
    const ticket = tickets.get(key(tenantId, id));
    return ticket && ticket.tenantId === tenantId ? { ...ticket } : null;
  }

  async function update(tenantId, id, patch) {
    assertTenant(tenantId);
    const ticket = tickets.get(key(tenantId, id));
    if (!ticket) throw new TicketError('NOT_FOUND', 'Tiket tidak ditemukan untuk tenant ini');

    const next = { ...ticket, ...patch };
    if (patch.status === TICKET_STATUS.SELESAI && !ticket.closedAt) {
      next.closedAt = now().toISOString();
    }

    tickets.set(key(tenantId, id), next);
    return { ...next };
  }

  /** Board columns for screen 13, in the fixed four-column order. */
  async function board(tenantId, { locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);
    const rows = await list(tenantId);
    const labels = ticketStatusLabels(locale);

    return TICKET_STATUS_ORDER.map((status) => ({
      status,
      label: labels[status],
      tickets: rows.filter((ticket) => ticket.status === status),
    }));
  }

  /** Median days to close, and the SLA it is measured against. */
  async function closeTimeStats(tenantId) {
    assertTenant(tenantId);
    const closed = (await list(tenantId)).filter((ticket) => ticket.closedAt);

    if (closed.length === 0) return { closed: 0, averageDays: null, slaDays: SLA_DAYS };

    const days = closed.map(
      (ticket) =>
        (new Date(ticket.closedAt).getTime() - new Date(ticket.createdAt).getTime()) /
        (24 * 3600 * 1000),
    );

    return {
      closed: closed.length,
      averageDays: Number((days.reduce((sum, d) => sum + d, 0) / days.length).toFixed(1)),
      slaDays: SLA_DAYS,
    };
  }

  return { create, list, get, update, board, closeTimeStats };
}
