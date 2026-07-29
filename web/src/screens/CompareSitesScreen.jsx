import { useCallback, useState } from 'react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';

/**
 * Screen 09 · Bandingkan lokasi — AC-5.3.
 *
 * Two columns, one row per factor, and the agent's conclusion at the foot of
 * each. The better figure in each row is marked, and every row says where its
 * number came from — measured, surveyed, or modelled. A comparison that showed
 * only the totals would invite agreement; showing the rows lets the reader
 * disagree with the ranking, which is the point of putting them side by side.
 */
export function CompareSitesScreen({ onNavigate, query }) {
  const { locationSource, agent, role, tenant } = useSession();
  const [receipt, setReceipt] = useState(null);

  const ids = [query?.get('a'), query?.get('b')].filter(Boolean);

  const load = useCallback(
    () =>
      locationSource.compareSites(tenant?.tenantId ?? 'nusa-retail', ids.length === 2 ? ids : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locationSource, tenant?.tenantId, ids.join(',')],
  );
  const { status, data, error, reload } = useAsyncData(load);

  const mayAct = canWrite(role);

  const raiseSurvey = async (candidate) => {
    try {
      const ticket = await agent.createTicket({
        title: `Survei lahan kandidat ${candidate.name}`,
        owner: 'Tim Ekspansi',
        sourceInsightId: `compare-${candidate.id}`,
        sourceKind: 'agent_run',
      });
      setReceipt(`Tiket ${ticket.id} dibuat untuk ${ticket.owner}.`);
    } catch (failure) {
      setReceipt(failure?.message ?? 'Tiket gagal dibuat.');
    }
  };

  return (
    <>
      <DataPanel
        status={status === PANEL_STATUS.READY && !data ? PANEL_STATUS.EMPTY : status}
        kicker="Bandingkan kandidat"
        meta={data ? <span className="panel-meta">{data.rows.length} faktor</span> : null}
        loading={{ message: 'Agen Lokasi sedang membandingkan kandidat…' }}
        empty={{
          title: 'Belum ada kandidat untuk dibandingkan',
          description: 'Pilih dua kandidat dari Site Scout.',
          actionLabel: 'Buka Site Scout',
          onAction: () => onNavigate?.('/site-scout'),
        }}
        error={{
          title: 'Perbandingan tak bisa dimuat',
          description: error?.message ?? 'Layanan lokasi tidak menjawab.',
          onRetry: reload,
        }}
      >
        {data ? (
          <div className="table-scroll">
            <table className="table compare-table">
              <caption className="sr-only">
                Perbandingan {data.a.name} dan {data.b.name}, faktor demi faktor
              </caption>
              <thead>
                <tr>
                  <th scope="col">Faktor</th>
                  <th scope="col" className="compare-col-a">
                    <span className="kicker">Kandidat A · direkomendasikan</span>
                    <span className="compare-name">{data.a.name}</span>
                  </th>
                  <th scope="col">
                    <span className="kicker">Kandidat B</span>
                    <span className="compare-name">{data.b.name}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">
                      {row.label}
                      <span className="factor-origin"> · {row.origin}</span>
                    </th>
                    <td className={`compare-col-a${row.favours === 'a' ? ' is-better' : ''}`}>
                      {row.display.a}
                    </td>
                    <td className={row.favours === 'b' ? 'is-better' : undefined}>
                      {row.display.b}
                    </td>
                  </tr>
                ))}
                <tr className="compare-conclusion">
                  <th scope="row">Kesimpulan agen</th>
                  <td className="compare-col-a">{data.a.conclusion}</td>
                  <td>{data.b.conclusion}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </DataPanel>

      {data ? (
        <>
          <div className="state-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => raiseSurvey(data.a)}
              disabled={!mayAct}
            >
              Ajukan survei {data.a.name}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate?.('/site-scout')}
            >
              Ganti kandidat
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onNavigate?.('/chat')}
            >
              Tanya agen: “bagaimana kalau target volume?”
            </button>
          </div>

          {receipt ? (
            <p className="state-note" role="status">
              {receipt}
            </p>
          ) : null}

          <p className="state-note compare-foot">
            Baris bertanda <strong>terukur</strong> dihitung dari Places dan jarak geografis.{' '}
            <strong>Survei</strong> berasal dari data lapangan yang belum kami miliki penuh.{' '}
            <strong>Model</strong> adalah estimasi: kunjungan/hari ≈ skor lalu lintas ×{' '}
            {data.visitsModel.perTrafficPoint}, dibagi{' '}
            {`1 + pesaing × ${data.visitsModel.competitorWeight}`}, dengan rentang ±
            {Math.round(data.visitsModel.band * 100)}%. Angka model bukan hasil pengukuran.
          </p>
        </>
      ) : null}
    </>
  );
}
