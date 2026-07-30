import { useCallback, useState } from 'react';

import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { useLocale } from '../i18n/index.js';
import { MapField } from './map/MapField.jsx';

const LAYERS = [
  { id: 'skor', labelKey: 'peta.layerScore' },
  { id: 'reputasi', labelKey: 'peta.layerReputation' },
  { id: 'pesaing', labelKey: 'peta.layerCompetitors' },
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
 * on this screen is drawn from a fixture. The factor labels come back on the
 * score itself, so the panel and the domain cannot disagree about what a factor
 * is called.
 */
export function NetworkMapScreen({ onNavigate }) {
  const { locationSource, tenant } = useSession();
  const { t, fmt, errorText } = useLocale();
  // The rail shows the tenant's whole estate; this map shows the branches the
  // dataset actually covers. Both numbers are true and they differ, so the
  // panel says which is which rather than leaving the reader to guess.
  const declared = tenant?.outletCount ?? null;
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
        kicker={t('peta.kicker')}
        meta={
          data ? (
            <span className="panel-meta">
              {declared && declared > outlets.length
                ? t('peta.metaSubset', { shown: outlets.length, declared })
                : t('peta.metaAll', { count: outlets.length })}{' '}
              · {t('peta.metaPoi', { count: fmt.integer(data.sourceCount) })}
            </span>
          ) : null
        }
        loading={{ message: t('peta.loading') }}
        empty={{ title: t('peta.emptyTitle'), description: t('peta.emptyDescription') }}
        error={{
          title: t('peta.errorTitle'),
          description: errorText(error, 'peta.errorFallback'),
          onRetry: reload,
        }}
      >
        {data ? (
          <>
            <div className="map-layers" role="radiogroup" aria-label={t('peta.layersLabel')}>
              {LAYERS.map((entry) => (
                <label key={entry.id} className="map-layer">
                  <input
                    type="radio"
                    name="map-layer"
                    checked={layer === entry.id}
                    onChange={() => setLayer(entry.id)}
                  />
                  {t(entry.labelKey)}
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
                <span className="legend-mark legend-outlet" aria-hidden="true" />{' '}
                {t('peta.legendOutlet')}
              </li>
              <li>
                <span className="legend-mark legend-competitor" aria-hidden="true" />{' '}
                {t('peta.legendCompetitor')}
              </li>
              <li>
                <span className="legend-mark legend-radius" aria-hidden="true" />{' '}
                {t('peta.legendRadius')}
              </li>
            </ul>
          </>
        ) : null}
      </DataPanel>

      <div className="map-side">
        <DataPanel
          status={status}
          kicker={t('peta.scoresKicker')}
          loading={{ message: t('peta.scoresLoading') }}
          empty={{ title: t('peta.scoresEmpty') }}
          error={{ title: t('peta.scoresError'), onRetry: reload }}
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
                        {outlet.rating === null ? '—' : fmt.number(outlet.rating, 1)}
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
                  {t('peta.openDetail', { name: selected.name })}
                </button>
              ) : null}
            </>
          ) : null}
        </DataPanel>

        <DataPanel
          status={status}
          kicker={t('peta.noteKicker')}
          loading={{ message: t('peta.noteLoading') }}
          empty={{
            title: t('peta.noteEmptyTitle'),
            description: t('peta.noteEmptyDescription'),
          }}
          error={{ title: t('peta.noteError'), onRetry: reload }}
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
            <span className="kicker">{t('peta.factorsKicker', { name: selected.name })}</span>
            <ul className="factor-list">
              {Object.entries(selected.factors).map(([key, value]) => (
                <li key={key}>
                  <span className="factor-label">
                    {selected.labels?.[key] ?? key}
                    {/* Saying which figures are measured and which surveyed is
                        the difference between a score and a guess. */}
                    <span className="factor-origin">
                      {selected.surveyedFactors?.includes(key)
                        ? t('common.surveyed')
                        : t('common.fromPlaces')}
                    </span>
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
