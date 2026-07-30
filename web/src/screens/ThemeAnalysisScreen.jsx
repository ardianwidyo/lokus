import { useCallback } from 'react';

import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { useLocale } from '../i18n/index.js';
import { Sparkline, intensityStyle } from './theme/Sparkline.jsx';

/** Branch codes and their column abbreviations: names, not copy. */
const OUTLET_COLUMNS = [
  { outletId: 'BKS-02', short: 'Bks' },
  { outletId: 'CKR-01', short: 'Ckr' },
  { outletId: 'DPK-01', short: 'Dpk' },
  { outletId: 'SRP-03', short: 'Srp' },
  { outletId: 'BGR-01', short: 'Bgr' },
  { outletId: 'TGR-01', short: 'Tgr' },
];

/**
 * Screen 07 · Analisis tema & sentimen.
 *
 * The matrix is the argument: one theme per row, one branch per column, and an
 * 8-week trend beside it. Intensity uses a single accent ramp, so a reader
 * compares cells by weight rather than decoding hues.
 *
 * Every cell is a count of clustered reviews. Nothing on this screen is typed
 * in by hand.
 */
export function ThemeAnalysisScreen() {
  const { reputation } = useSession();
  const { t, fmt, errorText } = useLocale();

  const load = useCallback(() => reputation.themeMatrix(), [reputation]);
  const { status, data, error, reload } = useAsyncData(load);

  const themes = data?.themes ?? [];
  const max = Math.max(1, ...themes.flatMap((theme) => Object.values(theme.byOutlet ?? {})));

  return (
    <>
      <DataPanel
        status={themes.length === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status}
        kicker={t('tema.kicker')}
        title={t('tema.title')}
        meta={
          data ? (
            <span className="panel-meta">
              {t('tema.meta', {
                reviews: fmt.integer(data.reviewsConsidered),
                sources: fmt.integer(data.sourceCount),
              })}
            </span>
          ) : null
        }
        loading={{ message: t('tema.loading') }}
        empty={{
          title: t('tema.emptyTitle'),
          description: t('tema.emptyDescription'),
          onAction: reload,
        }}
        error={{
          title: t('tema.errorTitle'),
          description: errorText(error, 'tema.errorFallback'),
          onRetry: reload,
        }}
      >
        <div className="table-scroll">
          <table className="table theme-matrix">
            <caption className="sr-only">{t('tema.caption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('tema.colTheme')}</th>
                {OUTLET_COLUMNS.map((column) => (
                  <th key={column.outletId} scope="col">
                    {column.short}
                  </th>
                ))}
                <th scope="col">{t('tema.colTrend')}</th>
                <th scope="col">{t('tema.colSystemic')}</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((theme) => (
                <tr key={theme.theme}>
                  <th scope="row">{theme.label}</th>
                  {OUTLET_COLUMNS.map((column) => {
                    const value = theme.byOutlet?.[column.outletId] ?? 0;
                    return (
                      <td
                        key={column.outletId}
                        className="matrix-cell"
                        style={intensityStyle(value, max)}
                      >
                        {value || '—'}
                      </td>
                    );
                  })}
                  <td>
                    <Sparkline
                      values={theme.weekly}
                      label={t('tema.sparklineLabel', {
                        theme: theme.label,
                        count: theme.weekly?.at(-1) ?? 0,
                      })}
                    />
                  </td>
                  <td>
                    {theme.systemic ? (
                      <span className="tag tag-accent" title={theme.systemicReason}>
                        {t('tema.regions', { count: theme.regionCount })}
                      </span>
                    ) : (
                      <span className="tag tag-neutral" title={theme.systemicReason}>
                        {t('tema.local')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPanel>

      <div className="theme-cards">
        <DataPanel
          status={status}
          kicker={t('tema.findingKicker')}
          loading={{ message: t('tema.findingLoading') }}
          empty={{ title: t('tema.findingEmpty') }}
          error={{ title: t('tema.findingError'), onRetry: reload }}
        >
          {data?.finding ? (
            <>
              <h3 className="finding-headline">{data.finding.headline}</h3>
              <p className="state-description">{data.finding.detail}</p>
              <ul className="finding-tags">
                <li>
                  <span className="tag tag-neutral">
                    {t('tema.findingComplaints', { count: data.finding.count })}
                  </span>
                </li>
                <li>
                  <span className="tag tag-neutral">
                    {t('tema.regions', { count: data.finding.regionCount })}
                  </span>
                </li>
                <li>
                  <span className="tag tag-neutral">
                    {t('tema.findingWorst', { name: data.finding.worstOutlet?.name })}
                  </span>
                </li>
              </ul>
            </>
          ) : (
            <p className="state-description">{t('tema.noSystemic')}</p>
          )}
        </DataPanel>

        <DataPanel
          status={status}
          kicker={t('tema.sentimentKicker')}
          loading={{ message: t('tema.sentimentLoading') }}
          empty={{ title: t('tema.sentimentEmpty') }}
          error={{ title: t('tema.sentimentError'), onRetry: reload }}
        >
          {data ? (
            <>
              <ul className="sentiment-bars">
                {data.sentimentByWeek.map((share, index) => (
                  <li key={index}>
                    <span
                      className="sentiment-bar"
                      style={{ height: `${Math.max(4, share * 160)}px` }}
                      title={t('tema.sentimentBarLabel', {
                        week: index + 1,
                        share: fmt.percent(share),
                      })}
                    />
                  </li>
                ))}
              </ul>
              <p className="state-description">
                {t('tema.sentimentNote', {
                  first: fmt.percent(data.sentimentByWeek[0]),
                  last: fmt.percent(data.sentimentByWeek.at(-1)),
                })}
              </p>
            </>
          ) : null}
        </DataPanel>

        <DataPanel
          status={status}
          kicker={t('tema.practiceKicker')}
          loading={{ message: t('tema.practiceLoading') }}
          empty={{ title: t('tema.practiceEmpty') }}
          error={{ title: t('tema.practiceError'), onRetry: reload }}
        >
          {data?.bestPractice ? (
            <>
              <h3 className="finding-headline">{data.bestPractice.outletName}</h3>
              <p className="state-description">
                {t('tema.practiceDescription', {
                  theme: data.bestPractice.label,
                  count: data.bestPractice.count,
                })}
              </p>
              <Blueprint className="practice-note">
                <p className="state-description">{t('tema.practiceCaveat')}</p>
              </Blueprint>
            </>
          ) : null}
        </DataPanel>
      </div>
    </>
  );
}
