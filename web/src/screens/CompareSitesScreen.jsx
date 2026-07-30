import { useCallback, useState } from 'react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { Rich, useLocale } from '../i18n/index.js';

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
  const { t, fmt, errorText } = useLocale();
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
        title: t('scout.surveyTitle', { name: candidate.name }),
        owner: t('scout.ownerExpansion'),
        sourceInsightId: `compare-${candidate.id}`,
        sourceKind: 'agent_run',
      });
      setReceipt(t('common.ticketCreated', { id: ticket.id, owner: ticket.owner }));
    } catch (failure) {
      setReceipt(errorText(failure, 'common.ticketFailed'));
    }
  };

  return (
    <>
      <DataPanel
        status={status === PANEL_STATUS.READY && !data ? PANEL_STATUS.EMPTY : status}
        kicker={t('compare.kicker')}
        meta={
          data ? <span className="panel-meta">{t('compare.meta', { count: data.rows.length })}</span> : null
        }
        loading={{ message: t('compare.loading') }}
        empty={{
          title: t('compare.emptyTitle'),
          description: t('compare.emptyDescription'),
          actionLabel: t('compare.emptyAction'),
          onAction: () => onNavigate?.('/site-scout'),
        }}
        error={{
          title: t('compare.errorTitle'),
          description: errorText(error, 'compare.errorFallback'),
          onRetry: reload,
        }}
      >
        {data ? (
          <div className="table-scroll">
            <table className="table compare-table">
              <caption className="sr-only">
                {t('compare.caption', { a: data.a.name, b: data.b.name })}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t('compare.colFactor')}</th>
                  <th scope="col" className="compare-col-a">
                    <span className="kicker">{t('compare.colA')}</span>
                    <span className="compare-name">{data.a.name}</span>
                  </th>
                  <th scope="col">
                    <span className="kicker">{t('compare.colB')}</span>
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
                  <th scope="row">{t('compare.conclusion')}</th>
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
              {t('compare.raiseSurvey', { name: data.a.name })}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate?.('/site-scout')}
            >
              {t('compare.swap')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => onNavigate?.('/chat')}>
              {t('compare.askAgent')}
            </button>
          </div>

          {receipt ? (
            <p className="state-note" role="status">
              {receipt}
            </p>
          ) : null}

          <p className="state-note compare-foot">
            <Rich
              k="compare.foot"
              values={{
                measured: <strong>{t('compare.footMeasured')}</strong>,
                surveyed: <strong>{t('compare.footSurveyed')}</strong>,
                model: <strong>{t('compare.footModel')}</strong>,
                perPoint: data.visitsModel.perTrafficPoint,
                weight: fmt.factor(data.visitsModel.competitorWeight),
                band: fmt.percent(data.visitsModel.band),
              }}
            />
          </p>
        </>
      ) : null}
    </>
  );
}
