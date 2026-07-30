import { useCallback, useMemo, useState } from 'react';

import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { Rich, useLocale } from '../i18n/index.js';
import { RadiusMap } from './outlet/RadiusMap.jsx';
import { RatingChart } from './outlet/RatingChart.jsx';

const DEFAULT_OUTLET = 'BKS-02';

/** design/SCREENS.md screen 04: a week that moved this much gets a larger point. */
const CHANGE_THRESHOLD = 0.15;

/**
 * Screen 04 · Detail cabang.
 *
 * One branch read across all three agents at once. The screen exists for the
 * moment where two independent signals point at the same thing — a weak score
 * factor and a leading complaint theme — and that sentence is only worth
 * writing when the data actually says it, so it is composed from the numbers
 * rather than stored as copy.
 */
export function OutletDetailScreen({ onNavigate, query }) {
  const { outletSource, tenant } = useSession();
  const { t, fmt, errorText } = useLocale();
  const tenantId = tenant?.tenantId ?? 'nusa-retail';
  const [chosen, setChosen] = useState(null);

  const outletId = chosen ?? query?.get('outlet') ?? DEFAULT_OUTLET;

  const loadList = useCallback(() => outletSource.list(tenantId), [outletSource, tenantId]);
  const loadDetail = useCallback(
    () => outletSource.detail(tenantId, outletId),
    [outletSource, tenantId, outletId],
  );

  const branches = useAsyncData(loadList);
  const detail = useAsyncData(loadDetail);
  const { data, error, reload } = detail;

  // The service answers `null` for a branch this tenant cannot see. That is an
  // empty result, not a ready one: rendering ready with no data would leave a
  // header of dashes and no explanation.
  const status =
    detail.status === PANEL_STATUS.READY && !data ? PANEL_STATUS.EMPTY : detail.status;

  const insight = useMemo(() => crossSignal(data, t, fmt), [data, t, fmt]);

  return (
    <>
      {/* Outside the panel on purpose: the picker is its own request, and a
          branch that fails to load must not also take away the only control
          that could get the reader to a branch that works. */}
      {branches.data ? (
        <div className="outlet-picker" role="radiogroup" aria-label={t('cabang.pickerLabel')}>
          {branches.data.map((row) => (
            <label key={row.outletId} className="map-layer">
              <input
                type="radio"
                name="outlet"
                checked={row.outletId === outletId}
                onChange={() => setChosen(row.outletId)}
              />
              {row.name}
            </label>
          ))}
        </div>
      ) : null}

      <DataPanel
        status={status}
        className="outlet-header"
        kicker={
          data
            ? t('cabang.kicker', {
                code: data.outlet.code,
                month: fmt.monthYear(data.outlet.openedAt),
              })
            : t('cabang.kickerPlain')
        }
        loading={{ message: t('cabang.loading') }}
        empty={{ title: t('cabang.emptyTitle'), description: t('cabang.emptyDescription') }}
        error={{
          title: t('cabang.errorTitle'),
          description: errorText(error, 'cabang.errorFallback'),
          onRetry: reload,
        }}
      >
        {data ? (
          <div className="outlet-headline">
            <div>
              <h2 className="outlet-name">{data.outlet.name}</h2>
              <p className="outlet-meta">
                {t('cabang.meta', {
                  address: data.outlet.address,
                  manager: data.outlet.manager,
                })}
              </p>
            </div>

            <div className="outlet-figures">
              <Blueprint className="figure">
                <span className="kicker">{t('cabang.ratingKicker')}</span>
                <span className="figure-value">{fmt.number(data.rating.mean) ?? '—'}</span>
                <span className="figure-note">
                  {t('cabang.ratingNote', {
                    delta: fmt.signed(data.rating.delta) ?? '—',
                    weeks: data.rating.blockWeeks,
                  })}
                </span>
              </Blueprint>
              <Blueprint className="figure">
                <span className="kicker">{t('cabang.locationScoreKicker')}</span>
                <span className="figure-value">{data.location.score}</span>
                <span className="figure-note">
                  {t('cabang.locationScoreNote', {
                    rank: data.location.rank,
                    of: data.location.of,
                  })}
                </span>
              </Blueprint>
            </div>
          </div>
        ) : null}
      </DataPanel>

      <div className="outlet-grid">
        <div className="outlet-main">
          <DataPanel
            status={status}
            kicker={
              data
                ? t('cabang.trendKicker', { weeks: data.trend.weeks })
                : t('cabang.trendKickerPlain')
            }
            meta={
              data ? (
                <span className="panel-meta">
                  {t('cabang.trendMeta', {
                    count: fmt.integer(data.rating.reviewCount),
                    rating: fmt.number(data.rating.latestWeekRating) ?? '—',
                  })}
                </span>
              ) : null
            }
            loading={{ message: t('cabang.trendLoading') }}
            empty={{ title: t('cabang.trendEmpty') }}
            error={{ title: t('cabang.trendError'), onRetry: reload }}
          >
            {data ? (
              <>
                <RatingChart
                  points={data.trend.points}
                  changePoints={data.trend.changePoints}
                  event={data.event}
                  weeks={data.trend.weeks}
                />

                <p className="state-note">
                  {t('cabang.trendNote', {
                    weeks: data.trend.weeks,
                    threshold: fmt.number(CHANGE_THRESHOLD),
                  })}
                </p>

                {data.event ? (
                  <p className="state-description">
                    <Rich
                      k="cabang.eventOpened"
                      values={{
                        name: <strong>{data.event.name}</strong>,
                        day: fmt.shortDate(data.event.openedAt),
                        distance: data.event.distanceM,
                      }}
                    />{' '}
                    {data.event.ratingMoved
                      ? t('cabang.eventMoved', {
                          from: fmt.number(data.event.ratingMoved.from),
                          to: fmt.number(data.event.ratingMoved.to),
                          delta: fmt.signed(data.event.ratingMoved.delta),
                        })
                      : t('cabang.eventNotEnough')}{' '}
                    {t('cabang.eventCaveat')}
                  </p>
                ) : (
                  <p className="state-note">
                    {t('cabang.noEvent', {
                      radius: data.nearby.radiusM,
                      weeks: data.trend.weeks,
                    })}
                  </p>
                )}
              </>
            ) : null}
          </DataPanel>

          <DataPanel
            status={
              data && data.themes.length === 0 && status === PANEL_STATUS.READY
                ? PANEL_STATUS.EMPTY
                : status
            }
            kicker={
              data
                ? t('cabang.themesKicker', { weeks: data.trend.weeks })
                : t('cabang.themesKickerPlain')
            }
            meta={
              data ? (
                <span className="panel-meta">
                  {t('cabang.themesMeta', { count: data.complaintCount })}
                </span>
              ) : null
            }
            loading={{ message: t('cabang.themesLoading') }}
            empty={{
              title: t('cabang.themesEmptyTitle'),
              description: t('cabang.themesEmptyDescription'),
            }}
            error={{ title: t('cabang.themesError'), onRetry: reload }}
          >
            {data?.themes.length ? (
              <>
                <ul className="theme-bars">
                  {data.themes.map((theme) => (
                    <li key={theme.theme}>
                      <span className="theme-bar-label">{theme.label}</span>
                      <span className="factor-track" aria-hidden="true">
                        <span
                          className="factor-fill"
                          style={{ width: `${Math.round(theme.share * 100)}%` }}
                        />
                      </span>
                      <span className="theme-bar-share">{fmt.percent(theme.share)}</span>
                      <span className="theme-bar-count">{theme.count}</span>
                    </li>
                  ))}
                </ul>
                <p className="state-note">
                  {t('cabang.themesNote', {
                    complaints: data.complaintCount,
                    reviews: fmt.integer(data.rating.reviewCount),
                  })}
                </p>
              </>
            ) : null}
          </DataPanel>
        </div>

        <div className="outlet-side">
          <DataPanel
            status={status}
            kicker={t('cabang.nearbyKicker')}
            loading={{ message: t('cabang.nearbyLoading') }}
            empty={{ title: t('cabang.nearbyEmpty') }}
            error={{ title: t('cabang.nearbyError'), onRetry: reload }}
          >
            {data ? (
              <>
                <RadiusMap
                  outlet={data.outlet}
                  pois={data.nearby.pois}
                  radiusM={data.nearby.radiusM}
                />
                <p className="state-note">
                  {t('cabang.nearbyNote', {
                    km: fmt.factor(data.nearby.radiusM / 1000),
                    total: data.nearby.total,
                    fresh: data.nearby.newSinceCount,
                  })}
                </p>
              </>
            ) : null}
          </DataPanel>

          <DataPanel
            status={status}
            kicker={t('cabang.factorsKicker')}
            loading={{ message: t('cabang.factorsLoading') }}
            empty={{ title: t('cabang.factorsEmpty') }}
            error={{ title: t('cabang.factorsError'), onRetry: reload }}
          >
            {data ? (
              <>
                <ul className="factor-list">
                  {Object.entries(data.location.factors).map(([key, value]) => (
                    <li key={key}>
                      <span className="factor-label">
                        {data.location.factorLabels[key]}
                        <span className="factor-origin">
                          {data.location.surveyedFactors.includes(key)
                            ? t('common.surveyed')
                            : t('common.measured')}
                        </span>
                      </span>
                      <span className="factor-track" aria-hidden="true">
                        <span className="factor-fill" style={{ width: `${value}%` }} />
                      </span>
                      <span className="factor-value">{value}</span>
                    </li>
                  ))}
                </ul>

                {insight ? <p className="state-description">{insight}</p> : null}
              </>
            ) : null}
          </DataPanel>

          {data ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => onNavigate?.('/review')}
              >
                {t('cabang.openQueue', { count: data.queue.unreplied })}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => onNavigate?.('/chat')}
              >
                {t('cabang.askAgent')}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

/**
 * The only factor that has a complaint theme meaning the same thing. Foot
 * traffic and surrounding category mix have no complaint that corresponds to
 * them, and inventing a correspondence — "category mix" as an explanation for
 * price complaints — would be the unearned inference this screen exists to
 * avoid. One honest pair beats four plausible ones.
 *
 * Keyed by factor id and theme id, both stable in either language: matching on
 * the labels would have worked only in Indonesian.
 */
const THEME_FOR_FACTOR = { access: 'parkir' };

/** How far down the theme list still counts as the same signal. */
const CORROBORATION_RANK = 3;

/**
 * The sentence design/SCREENS.md writes by hand — "parking is the biggest drag
 * and also the second complaint theme" — derived instead of asserted, so it
 * only appears on a branch where it is true.
 */
function crossSignal(data, t, fmt) {
  if (!data) return null;

  const [weakestKey] = Object.entries(data.location.factors)
    .filter(([key]) => key !== 'competitors')
    .sort((a, b) => a[1] - b[1])[0] ?? [];
  if (!weakestKey) return null;

  const themeId = THEME_FOR_FACTOR[weakestKey];
  if (!themeId) return null;

  const rank = data.themes.findIndex((theme) => theme.theme === themeId);
  // Outside the leading themes the pair is a coincidence, not corroboration:
  // "sixth complaint theme, two mentions" does not confirm anything.
  if (rank < 0 || rank >= CORROBORATION_RANK) return null;

  const theme = data.themes[rank];

  return t('cabang.crossSignal', {
    factor: capitalise(data.location.factorLabels[weakestKey]),
    value: fmt.integer(data.location.factors[weakestKey]),
    rank: rank + 1,
    count: theme.count,
  });
}

function capitalise(text) {
  const value = String(text ?? '');
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
