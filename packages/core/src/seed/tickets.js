import { DEMO_NOW, DAY_MS } from '../domain/clock.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { t } from '../i18n/index.js';

/**
 * Tickets already in flight when the demo starts, so screen 13 shows a working
 * board rather than an empty one. Content follows design/SCREENS.md screen 13.
 *
 * Every seeded ticket carries a `sourceInsightId` like a real one — the board's
 * claim is that each piece of work traces back to the insight that caused it,
 * and a seed that skipped the link would quietly break that claim.
 *
 * Closed tickets carry an `impact`, which is what lets the network prove value
 * with numbers instead of anecdotes.
 *
 * Titles and impacts are agent-authored copy and come from the dictionary, keyed
 * by ticket id. Branch names, manager names and the approver's email address do
 * not: those are the tenant's own records.
 */
export function seedTickets({ tenantId = 'nusa-retail', now = DEMO_NOW, locale = DEFAULT_LOCALE } = {}) {
  const at = (daysAgo) => new Date(now.getTime() - daysAgo * DAY_MS).toISOString();
  const due = (daysAhead) => new Date(now.getTime() + daysAhead * DAY_MS).toISOString();

  const title = (id) => t(locale, `ticket.${id}.title`);
  const impact = (id) => t(locale, `ticket.${id}.impact`);

  const APPROVER = 'manajer@nusaretail.co.id';

  return [
    {
      id: 'T-119',
      tenantId,
      title: title('T-119'),
      outletId: 'DPK-01',
      outletName: 'Depok Margonda',
      owner: 'Sari Wulandari',
      status: 'baru',
      theme: 'stok-kosong',
      sourceInsightId: 'insight-seed-stok-depok',
      sourceKind: 'agent_run',
      createdBy: t(locale, 'agent.reputation'),
      createdByKind: 'agent',
      createdAt: at(0.2),
      dueAt: due(5),
      closedAt: null,
      impact: null,
    },
    {
      id: 'T-121',
      tenantId,
      title: title('T-121'),
      outletId: 'SRP-03',
      outletName: 'Serpong Sektor 7',
      owner: 'Bayu Nugroho',
      status: 'baru',
      theme: 'parkir',
      sourceInsightId: 'insight-seed-parkir-serpong',
      sourceKind: 'agent_run',
      createdBy: t(locale, 'agent.reputation'),
      createdByKind: 'agent',
      createdAt: at(1),
      dueAt: due(4),
      closedAt: null,
      impact: null,
    },
    {
      id: 'T-118',
      tenantId,
      title: title('T-118'),
      outletId: 'BKS-02',
      outletName: 'Bekasi Timur',
      owner: 'Dwi Kurnia',
      status: 'dikerjakan',
      theme: 'antrean-kasir',
      sourceInsightId: 'insight-seed-antrean-bekasi',
      sourceKind: 'briefing_decision',
      createdBy: APPROVER,
      createdByKind: 'user',
      createdAt: at(2),
      dueAt: due(6),
      closedAt: null,
      impact: null,
    },
    {
      id: 'T-116',
      tenantId,
      title: title('T-116'),
      outletId: null,
      outletName: null,
      owner: t(locale, 'ticket.ownerNetwork'),
      status: 'dikerjakan',
      theme: 'antrean-kasir',
      sourceInsightId: 'insight-seed-praktik-bogor',
      sourceKind: 'briefing_decision',
      createdBy: APPROVER,
      createdByKind: 'user',
      createdAt: at(4),
      dueAt: due(10),
      closedAt: null,
      impact: null,
    },
    {
      id: 'T-120',
      tenantId,
      title: title('T-120'),
      outletId: null,
      outletName: null,
      owner: t(locale, 'ticket.ownerExpansion'),
      status: 'menunggu',
      theme: null,
      sourceInsightId: 'insight-seed-scout-cibubur',
      sourceKind: 'agent_run',
      createdBy: t(locale, 'agent.location'),
      createdByKind: 'agent',
      createdAt: at(3),
      dueAt: due(7),
      closedAt: null,
      impact: impact('T-120'),
    },
    {
      id: 'T-114',
      tenantId,
      title: title('T-114'),
      outletId: null,
      outletName: null,
      owner: t(locale, 'ticket.ownerNetwork'),
      status: 'selesai',
      theme: 'antrean-kasir',
      sourceInsightId: 'insight-seed-sop-antrean',
      sourceKind: 'briefing_decision',
      createdBy: APPROVER,
      createdByKind: 'user',
      createdAt: at(9),
      dueAt: due(-4),
      closedAt: at(5.9),
      impact: impact('T-114'),
    },
    {
      id: 'T-109',
      tenantId,
      title: title('T-109'),
      outletId: 'BGR-01',
      outletName: 'Bogor Pajajaran',
      owner: 'Intan Permata',
      status: 'selesai',
      theme: null,
      sourceInsightId: 'insight-seed-backlog-bogor',
      sourceKind: 'agent_run',
      createdBy: t(locale, 'agent.reputation'),
      createdByKind: 'agent',
      createdAt: at(12),
      dueAt: due(-6),
      closedAt: at(10.8),
      impact: impact('T-109'),
    },
  ];
}
