import { useCallback, useState } from 'react';

import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { MapField } from './map/MapField.jsx';

const LAYERS = [
  { id: 'skor', label: 'Skor lokasi' },
  { id: 'reputasi', label: 'Kesehatan reputasi' },
  { id: 'pesaing', label: 'Kepadatan pesaing' },
];

/**
 * Screen 03 · Peta jaringan cabang.
 *
 * The one dark surface in the product (design/UI-GUIDELINES.md: dark fields are
 * for maps only). Markers are shape-coded rather than colour-coded — square for
 * an own branch, circle for a competitor — so the map stays readable without
 * relying on hue, which is the same rule the rest of the system follows for
 * status.
 *
 * Every score, every marker position and the agent note are computed; nothing
 * on this screen is drawn from a fixture.
 */
export function NetworkMapScreen({ onNavigate }) {
  const { locationSource, tenant } = useSession();
  const [layer, setLayer] = useState('skor');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(
    () => locationSource.networkMap(tenant?.tenantId ?? 'nusa-retail'),
    [locationSource, tenant?.tenantId],
  );
  const { status, data, error, reload } = useAsyncData(load);

  const outlets = data?.outlets ?? [];
  const selected = outlets.find((outlet) => outlet.outletId === selectedId) ?? outlets[0] ?? null;

  return (
    <div className="map-grid">
      <DataPanel
        status={outlets.length === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status}
        className="map-panel"
        kicker="Peta jaringan"
        meta={
          data ? (
            <span className="panel-meta">
              {outlets.length} cabang · {data.sourceCount} POI dianalisis
            </span>
          ) : null
        }
        loading={{ message: 'Agen Lokasi sedang memindai area cabang…' }}
        empty={{
          title: 'Belum ada cabang untuk dipetakan',
          description: 'Tenant ini belum punya cabang yang terdaftar.',
        }}
        error={{
          title: 'Peta tak bisa dimuat',
          description: error?.message ?? 'Layanan lokasi tidak menjawab.',
          onRetry: reload,
        }}
      >
        {data ? (
          <>
            <div className="map-layers" role="radiogroup" aria-label="Lapisan peta">
              {LAYERS.map((entry) => (
                <label key={entry.id} className="map-layer">
                  <input
                    type="radio"
                    name="map-layer"
                    checked={layer === entry.id}
                    onChange={() => setLayer(entry.id)}
                  />
                  {entry.label}
                </label>
              ))}
            </div>

            <MapField
              outlets={outlets}
              competitors={data.competitors}
              layer={layer}
              selectedId={selected?.outletId ?? null}
              onSelect={setSelectedId}
            />

            <ul className="map-legend">
              <li>
                <span className="legend-mark legend-outlet" aria-hidden="true" /> Cabang sendiri
              </li>
              <li>
                <span className="legend-mark legend-competitor" aria-hidden="true" /> Pesaing
              </li>
              <li>
                <span className="legend-mark legend-radius" aria-hidden="true" /> Radius 1 km
              </li>
            </ul>
          </>
        ) : null}
      </DataPanel>

      <div className="map-side">
        <DataPanel
          status={status}
          kicker="Urut menurut · skor terendah"
          loading={{ message: 'Menghitung skor lokasi…' }}
          empty={{ title: 'Belum ada skor' }}
          error={{ title: 'Skor tak bisa dimuat', onRetry: reload }}
        >
          {data ? (
            <>
              <ul className="score-list">
                {outlets.map((outlet) => (
                  <li key={outlet.outletId}>
                    <button
                      type="button"
                      className={`score-row${outlet.outletId === selected?.outletId ? ' is-active' : ''}`}
                      onClick={() => setSelectedId(outlet.outletId)}
                    >
                      <span className="score-name">{outlet.name}</span>
                      <span className="score-rating">
                        {outlet.rating === null ? '—' : outlet.rating.toFixed(1).replace('.', ',')}
                      </span>
                      <span className="score-value">{outlet.score}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {selected ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => onNavigate?.(`/cabang?outlet=${selected.outletId}`)}
                >
                  Buka detail {selected.name}
                </button>
              ) : null}
            </>
          ) : null}
        </DataPanel>

        <DataPanel
          status={status}
          kicker="Catatan agen lokasi"
          loading={{ message: 'Agen sedang menyusun catatan…' }}
          empty={{
            title: 'Tidak ada temuan',
            description: 'Tidak ada cabang berdekatan dan tidak ada pesaing baru pekan ini.',
          }}
          error={{ title: 'Catatan tak bisa dimuat', onRetry: reload }}
        >
          {data?.agentNote ? (
            <>
              <h3 className="finding-headline">{data.agentNote.headline}</h3>
              <p className="state-description">{data.agentNote.body}</p>
              <ul className="finding-tags">
                {data.agentNote.evidence.map((item) => (
                  <li key={item}>
                    <span className="tag tag-neutral">{item}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </DataPanel>

        {selected ? (
          <Blueprint className="factor-card">
            <span className="kicker">Faktor skor · {selected.name}</span>
            <ul className="factor-list">
              {Object.entries(selected.factors).map(([key, value]) => (
                <li key={key}>
                  <span className="factor-label">
                    {FACTOR_LABELS[key]}
                    {/* Saying which figures are measured and which surveyed is
                        the difference between a score and a guess. */}
                    {selected.surveyedFactors?.includes(key) ? (
                      <span className="factor-origin"> · survei</span>
                    ) : (
                      <span className="factor-origin"> · dari Places</span>
                    )}
                  </span>
                  <span className="factor-track" aria-hidden="true">
                    <span className="factor-fill" style={{ width: `${value}%` }} />
                  </span>
                  <span className="factor-value">{value}</span>
                </li>
              ))}
            </ul>
          </Blueprint>
        ) : null}
      </div>
    </div>
  );
}

const FACTOR_LABELS = {
  traffic: 'Lalu lintas pejalan',
  mix: 'Bauran kategori sekitar',
  competitors: 'Kepadatan pesaing',
  access: 'Ketersediaan parkir',
};
