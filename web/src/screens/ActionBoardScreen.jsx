import { useCallback, useState } from 'react';
import { Check } from 'lucide-react';

import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';

const FILTERS = [
  { id: 'semua', label: 'Semua' },
  { id: 'dari-agen', label: 'Dari agen' },
  { id: 'milik-saya', label: 'Milik saya' },
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
  const [filter, setFilter] = useState('semua');

  const load = useCallback(async () => {
    const tenantId = tenant?.tenantId ?? 'nusa-retail';
    const [board, stats] = await Promise.all([
      ticketStore.board(tenantId),
      ticketStore.closeTimeStats(tenantId),
    ]);
    return { board, stats };
  }, [ticketStore, tenant?.tenantId]);

  const { status, data, error, reload } = useAsyncData(load);

  const matches = (ticket) => {
    if (filter === 'dari-agen') return ticket.createdBy?.startsWith('Agen');
    if (filter === 'milik-saya') return ticket.sourceKind === 'briefing_decision';
    return true;
  };

  const columns = (data?.board ?? []).map((column) => ({
    ...column,
    tickets: column.tickets.filter(matches),
  }));

  const total = columns.reduce((sum, column) => sum + column.tickets.length, 0);

  return (
    <>
      <div className="board-filters">
        <div className="seg" role="radiogroup" aria-label="Saring tiket">
          {FILTERS.map((entry) => (
            <label key={entry.id} className="seg-opt">
              <input
                type="radio"
                name="ticket-filter"
                checked={filter === entry.id}
                onChange={() => setFilter(entry.id)}
              />
              {entry.label} · {entry.id === 'semua' ? total : countFor(data?.board, entry.id)}
            </label>
          ))}
        </div>

        {data?.stats ? (
          <p className="board-stats">
            Rata-rata waktu tutup tiket:{' '}
            <strong>
              {data.stats.averageDays === null
                ? 'belum ada tiket selesai'
                : `${String(data.stats.averageDays).replace('.', ',')} hari`}
            </strong>{' '}
            · SLA {data.stats.slaDays} hari
          </p>
        ) : null}
      </div>

      <DataPanel
        status={total === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status}
        kicker="Papan tindakan"
        loading={{ message: 'Memuat tiket dari insight agen…' }}
        empty={{
          title: 'Belum ada tiket',
          description:
            'Setujui satu keputusan di Briefing Pagi atau satu jawaban di Chat agen, dan tiketnya muncul di sini.',
          actionLabel: 'Buka Briefing Pagi',
          onAction: () => onNavigate?.('/briefing'),
        }}
        error={{
          title: 'Papan tak bisa dimuat',
          description: error?.message ?? 'Layanan tiket tidak menjawab.',
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
                        {ticket.owner ?? 'belum ada pemilik'} ·{' '}
                        {ticket.status === 'selesai'
                          ? `ditutup ${daysBetween(ticket.createdAt, ticket.closedAt)} hari`
                          : `tenggat ${formatDate(ticket.dueAt)}`}
                      </p>

                      {/* The link back to the insight — the point of the board. */}
                      <p className="ticket-source">
                        dari {sourceLabel(ticket)} · {ticket.sourceInsightId}
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

      <p className="state-note board-foot">
        Setiap tiket menyimpan tautan ke insight yang melahirkannya dan mencatat dampaknya setelah
        ditutup. Itu yang membuat LOKUS bisa membuktikan nilai gunanya dengan angka, bukan cerita.
      </p>
    </>
  );
}

function countFor(board, filterId) {
  if (!board) return 0;
  const all = board.flatMap((column) => column.tickets);
  if (filterId === 'dari-agen') return all.filter((t) => t.createdBy?.startsWith('Agen')).length;
  if (filterId === 'milik-saya') return all.filter((t) => t.sourceKind === 'briefing_decision').length;
  return all.length;
}

function sourceLabel(ticket) {
  return ticket.sourceKind === 'briefing_decision' ? 'keputusan briefing' : 'jawaban agen';
}

function daysBetween(from, to) {
  const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
  return String(Number(days.toFixed(1))).replace('.', ',');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
