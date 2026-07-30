import { useCallback, useState } from 'react';
import { Check } from 'lucide-react';

import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { useLocale } from '../i18n/index.js';

const FILTERS = [
  { id: 'semua', labelKey: 'board.filterAll' },
  { id: 'dari-agen', labelKey: 'board.filterFromAgent' },
  { id: 'milik-saya', labelKey: 'board.filterMine' },
];

/**
 * Screen 13 · Papan tindakan.
 *
 * Four columns, and every card names the insight it came from. That link is the
 * whole argument of the screen: an insight nobody acted on is a slide, and a
 * ticket nobody can trace back to one cannot prove it was worth doing.
 *
 * Closed cards carry their measured impact, which is what turns the value claim
 * into a number.
 */
export function ActionBoardScreen({ onNavigate }) {
  const { ticketStore, tenant } = useSession();
  const { locale, t, fmt, errorText } = useLocale();
  const [filter, setFilter] = useState('semua');

  const load = useCallback(async () => {
    const tenantId = tenant?.tenantId ?? 'nusa-retail';
    const [board, stats] = await Promise.all([
      ticketStore.board(tenantId, { locale }),
      ticketStore.closeTimeStats(tenantId),
    ]);
    return { board, stats };
  }, [ticketStore, tenant?.tenantId, locale]);

  const { status, data, error, reload } = useAsyncData(load);

  const columns = (data?.board ?? []).map((column) => ({
    ...column,
    tickets: column.tickets.filter((ticket) => matchesFilter(ticket, filter)),
  }));

  const total = columns.reduce((sum, column) => sum + column.tickets.length, 0);

  return (
    <>
      <div className="board-filters">
        <div className="seg" role="radiogroup" aria-label={t('board.filterLabel')}>
          {FILTERS.map((entry) => (
            <label key={entry.id} className="seg-opt">
              <input
                type="radio"
                name="ticket-filter"
                checked={filter === entry.id}
                onChange={() => setFilter(entry.id)}
              />
              {t(entry.labelKey)} · {entry.id === 'semua' ? total : countFor(data?.board, entry.id)}
            </label>
          ))}
        </div>

        {data?.stats ? (
          <p className="board-stats">
            {t('board.stats', {
              average:
                data.stats.averageDays === null
                  ? t('board.statsNone')
                  : t('board.statsDays', { days: fmt.factor(data.stats.averageDays) }),
              sla: data.stats.slaDays,
            })}
          </p>
        ) : null}
      </div>

      <DataPanel
        status={total === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status}
        kicker={t('board.kicker')}
        loading={{ message: t('board.loading') }}
        empty={{
          title: t('board.emptyTitle'),
          description: t('board.emptyDescription'),
          actionLabel: t('board.emptyAction'),
          onAction: () => onNavigate?.('/briefing'),
        }}
        error={{
          title: t('board.errorTitle'),
          description: errorText(error, 'board.errorFallback'),
          onRetry: reload,
        }}
      >
        <div className="board">
          {columns.map((column) => (
            <section key={column.status} className="board-column" aria-label={column.label}>
              <header className="board-column-head">
                <h3 className="board-column-title">{column.label}</h3>
                <span className="board-column-count">{column.tickets.length}</span>
              </header>

              <ul className="board-cards">
                {column.tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Blueprint
                      className={`ticket-card${ticket.status === 'selesai' ? ' is-done' : ''}${
                        ticket.status === 'dikerjakan' ? ' is-active' : ''
                      }`}
                    >
                      <span className="ticket-id">{ticket.id}</span>
                      <p className="ticket-title">{ticket.title}</p>

                      <ul className="ticket-tags">
                        {ticket.outletName ? (
                          <li>
                            <span className="tag tag-neutral">{ticket.outletName}</span>
                          </li>
                        ) : null}
                        {ticket.theme ? (
                          <li>
                            <span className="tag tag-neutral">{ticket.theme.replace(/-/g, ' ')}</span>
                          </li>
                        ) : null}
                      </ul>

                      <p className="ticket-meta">
                        {ticket.owner ?? t('board.noOwner')} ·{' '}
                        {ticket.status === 'selesai'
                          ? t('board.closedIn', {
                              days: fmt.factor(daysBetween(ticket.createdAt, ticket.closedAt)),
                            })
                          : t('board.dueAt', { date: fmt.shortDate(ticket.dueAt) })}
                      </p>

                      {/* The link back to the insight — the point of the board. */}
                      <p className="ticket-source">
                        {t('board.source', {
                          source: t(
                            ticket.sourceKind === 'briefing_decision'
                              ? 'board.sourceBriefing'
                              : 'board.sourceAgent',
                          ),
                          id: ticket.sourceInsightId,
                        })}
                      </p>

                      {ticket.impact ? (
                        <p className="ticket-impact">
                          <Check size={12} strokeWidth={1.5} aria-hidden="true" />
                          {ticket.impact}
                        </p>
                      ) : null}
                    </Blueprint>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DataPanel>

      <p className="state-note board-foot">{t('board.foot')}</p>
    </>
  );
}

/**
 * Filters on `createdByKind`, which the ticket store states, rather than on the
 * display name. The old test was `createdBy.startsWith('Agen')`, which silently
 * matched nothing once the agent could be called "Reputation Agent".
 */
function matchesFilter(ticket, filter) {
  if (filter === 'dari-agen') return ticket.createdByKind === 'agent';
  if (filter === 'milik-saya') return ticket.sourceKind === 'briefing_decision';
  return true;
}

function countFor(board, filterId) {
  if (!board) return 0;
  return board.flatMap((column) => column.tickets).filter((ticket) => matchesFilter(ticket, filterId))
    .length;
}

function daysBetween(from, to) {
  const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
  return Number(days.toFixed(1));
}
