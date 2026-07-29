import { useCallback, useState } from 'react';
import { Info } from 'lucide-react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';

/**
 * Screen 08 · Site Scout.
 *
 * The other half of location intelligence: not "which branch is struggling"
 * but "where should the next one go". Same tools as screen 03, different
 * question.
 *
 * The rejected list is shown rather than dropped — a filter nobody can see is
 * indistinguishable from no filter, and the 1.2 km cannibalisation rule is the
 * one most worth showing working.
 */
export function SiteScoutScreen({ onNavigate }) {
  const { locationSource, agent, role, tenant } = useSession();
  const [receipts, setReceipts] = useState({});

  const load = useCallback(
    () => locationSource.siteScout(tenant?.tenantId ?? 'nusa-retail'),
    [locationSource, tenant?.tenantId],
  );
  const { status, data, error, reload } = useAsyncData(load);

  const mayAct = canWrite(role);

  const raiseSurvey = async (candidate) => {
    try {
      const ticket = await agent.createTicket({
        title: `Survei lahan kandidat ${candidate.name}`,
        outletId: null,
        owner: 'Tim Ekspansi',
        sourceInsightId: `site-scout-${candidate.id}`,
        sourceKind: 'agent_run',
      });
      setReceipts((previous) => ({
        ...previous,
        [candidate.id]: `Tiket ${ticket.id} dibuat untuk ${ticket.owner}.`,
      }));
    } catch (failure) {
      setReceipts((previous) => ({
        ...previous,
        [candidate.id]: failure?.message ?? 'Tiket gagal dibuat.',
      }));
    }
  };

  const recommended = data?.recommended ?? [];

  return (
    <>
      <DataPanel
        status={
          recommended.length === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status
        }
        kicker="Permintaan ke Agen Lokasi"
        loading={{ message: 'Agen Lokasi sedang menilai kandidat lokasi…' }}
        empty={{
          title: 'Tidak ada kandidat yang lolos',
          description:
            'Semua lokasi yang dipertimbangkan berada di bawah ambang jarak 1,2 km dari cabang yang sudah ada.',
          onAction: reload,
        }}
        error={{
          title: 'Site Scout tak bisa dimuat',
          description: error?.message ?? 'Layanan lokasi tidak menjawab.',
          onRetry: reload,
        }}
      >
        {data ? (
          <>
            <blockquote className="scout-request">{data.request}</blockquote>
            <dl className="scout-stats">
              <div>
                <dt>POI dianalisis</dt>
                <dd>{data.poiCount}</dd>
              </div>
              <div>
                <dt>Lolos filter</dt>
                <dd>{data.passedFilter}</dd>
              </div>
              <div>
                <dt>Direkomendasikan</dt>
                <dd>{recommended.length}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </DataPanel>

      <div className="scout-cards">
        {recommended.map((candidate) => (
          <Blueprint
            key={candidate.id}
            className={`scout-card${candidate.rank === 1 ? ' is-top' : ''}`}
          >
            <span className="kicker">Peringkat {candidate.rank}</span>
            <div className="scout-head">
              <h3 className="scout-name">{candidate.name}</h3>
              <span className="scout-score">{candidate.total}</span>
            </div>
            <p className="scout-area">{candidate.area}</p>

            <ul className="factor-list">
              {Object.entries(candidate.factors).map(([key, value]) => (
                <li key={key}>
                  <span className="factor-label">
                    {candidate.labels[key]}
                    <span className="factor-origin">
                      {candidate.surveyedFactors.includes(key) ? ' · survei' : ' · terukur'}
                    </span>
                  </span>
                  <span className="factor-track" aria-hidden="true">
                    <span className="factor-fill" style={{ width: `${value}%` }} />
                  </span>
                  <span className="factor-value">{value}</span>
                </li>
              ))}
            </ul>

            <p className="scout-reasoning">{candidate.reasoning}</p>

            <div className="state-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate?.(`/bandingkan?a=${candidate.id}`)}
              >
                Bandingkan
              </button>
              <button
                type="button"
                className={candidate.rank === 1 ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => raiseSurvey(candidate)}
                disabled={!mayAct}
              >
                Jadikan tiket survei
              </button>
            </div>

            {receipts[candidate.id] ? (
              <p className="state-note" role="status">
                {receipts[candidate.id]}
              </p>
            ) : null}
          </Blueprint>
        ))}
      </div>

      {data?.rejected?.length ? (
        <DataPanel status={PANEL_STATUS.READY} kicker="Ditolak filter">
          <ul className="rejected-list">
            {data.rejected.map((candidate) => (
              <li key={candidate.id}>
                <span className="rejected-name">{candidate.name}</span>
                <span className="tag tag-outline">skor {candidate.total}</span>
                <span className="rejected-reason">{candidate.reason}</span>
              </li>
            ))}
          </ul>
          <p className="state-note">
            Lokasi ini bukan gagal dinilai — skornya bagus. Ia ditolak karena terlalu dekat dengan
            cabang sendiri, jadi sebagian pelanggannya hanya akan berpindah.
          </p>
        </DataPanel>
      ) : null}

      <p className="state-note scout-foot">
        <Info size={13} strokeWidth={1.5} aria-hidden="true" />
        Kepadatan pesaing dihitung dari Places dalam radius yang tertera; jarak antar cabang sendiri
        dari perhitungan geografis. Lalu lintas pejalan dan bauran kategori masih berupa survei —
        ditandai di setiap baris. Bobot keempat faktor bisa diubah di Admin.
      </p>
    </>
  );
}
