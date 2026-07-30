import { useCallback, useState } from 'react';
import { Info } from 'lucide-react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { useLocale } from '../i18n/index.js';

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
  const { t, errorText } = useLocale();
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
        title: t('scout.surveyTitle', { name: candidate.name }),
        outletId: null,
        owner: t('scout.ownerExpansion'),
        sourceInsightId: `site-scout-${candidate.id}`,
        sourceKind: 'agent_run',
      });
      setReceipts((previous) => ({
        ...previous,
        [candidate.id]: t('common.ticketCreated', { id: ticket.id, owner: ticket.owner }),
      }));
    } catch (failure) {
      setReceipts((previous) => ({
        ...previous,
        [candidate.id]: errorText(failure, 'common.ticketFailed'),
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
        kicker={t('scout.kicker')}
        loading={{ message: t('scout.loading') }}
        empty={{
          title: t('scout.emptyTitle'),
          description: t('scout.emptyDescription'),
          onAction: reload,
        }}
        error={{
          title: t('scout.errorTitle'),
          description: errorText(error, 'scout.errorFallback'),
          onRetry: reload,
        }}
      >
        {data ? (
          <>
            <blockquote className="scout-request">{data.request}</blockquote>
            <dl className="scout-stats">
              <div>
                <dt>{t('scout.statPoi')}</dt>
                <dd>{data.poiCount}</dd>
              </div>
              <div>
                <dt>{t('scout.statPassed')}</dt>
                <dd>{data.passedFilter}</dd>
              </div>
              <div>
                <dt>{t('scout.statRecommended')}</dt>
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
            <span className="kicker">{t('scout.rank', { rank: candidate.rank })}</span>
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
                      {candidate.surveyedFactors.includes(key)
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

            <p className="scout-reasoning">{candidate.reasoning}</p>

            <div className="state-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate?.(`/bandingkan?a=${candidate.id}`)}
              >
                {t('scout.compare')}
              </button>
              <button
                type="button"
                className={candidate.rank === 1 ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => raiseSurvey(candidate)}
                disabled={!mayAct}
              >
                {t('scout.raiseSurvey')}
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
        <DataPanel status={PANEL_STATUS.READY} kicker={t('scout.rejectedKicker')}>
          <ul className="rejected-list">
            {data.rejected.map((candidate) => (
              <li key={candidate.id}>
                <span className="rejected-name">{candidate.name}</span>
                <span className="tag tag-outline">
                  {t('common.score', { score: candidate.total })}
                </span>
                <span className="rejected-reason">{candidate.reason}</span>
              </li>
            ))}
          </ul>
          <p className="state-note">{t('scout.rejectedNote')}</p>
        </DataPanel>
      ) : null}

      <p className="state-note scout-foot">
        <Info size={13} strokeWidth={1.5} aria-hidden="true" />
        {t('scout.foot')}
      </p>
    </>
  );
}
