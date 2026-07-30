import { useCallback, useState } from 'react';
import { Check, FileText, X } from 'lucide-react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { useLocale } from '../i18n/index.js';
import { Stars } from './review/ReviewList.jsx';

/**
 * design/SCREENS.md screen 06 names the four checks. The keys here are the
 * guardrail ids the domain returns, so a check the domain adds shows its raw
 * name rather than disappearing from the panel.
 */
const CHECK_LABEL_KEYS = {
  unsourced_claim: 'draft.checkUnsourced',
  personal_data: 'draft.checkPersonalData',
  tone_compliance: 'draft.checkTone',
  compensation_promise: 'draft.checkCompensation',
};

/**
 * Screen 06 · Draft balasan AI.
 *
 * The draft on the left, what it stands on to the right: the SOP passages with
 * their retrieval scores and quotes, then the four guardrail results. Reading
 * left to right you see the claim and then its evidence, which is the order a
 * reviewer needs before approving something a customer will read.
 */
export function ReplyDraftScreen({ reviewId, onNavigate }) {
  const { reputation, role } = useSession();
  const { t, fmt, errorText } = useLocale();
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    if (reviewId) return reputation.reviewDetail(reviewId);

    // No review named: open the first one that needs a human.
    const inbox = await reputation.inbox({ bucket: 'perlu-tindakan' });
    const first = inbox.rows[0];
    return first ? reputation.reviewDetail(first.id) : null;
  }, [reputation, reviewId]);

  const { status, data, error, reload } = useAsyncData(load);
  const mayAct = canWrite(role);

  const send = async () => {
    try {
      await reputation.approveAndSend({
        reviewId: data.review.id,
        approvedBy: 'manajer@nusaretail.co.id',
        role,
      });
      setNotice(t('draft.sentReceipt'));
      await reload();
    } catch (failure) {
      setNotice(errorText(failure, 'draft.sendFailed'));
    }
  };

  const panelStatus = status === PANEL_STATUS.READY && !data ? PANEL_STATUS.EMPTY : status;

  return (
    <div className="draft-grid">
      <DataPanel
        status={panelStatus}
        kicker={t('draft.sourceKicker')}
        loading={{ message: t('draft.loading') }}
        empty={{
          title: t('draft.emptyTitle'),
          description: t('draft.emptyDescription'),
          onAction: reload,
        }}
        error={{
          title: t('draft.errorTitle'),
          description: errorText(error, 'draft.errorFallback'),
          onRetry: reload,
        }}
      >
        {data ? (
          <>
            <p className="review-meta">
              {t('draft.reviewMeta', {
                outlet: data.review.outletName,
                relative: data.review.relative,
              })}
            </p>
            <Stars rating={data.review.rating} />
            <blockquote className="review-quote">{data.review.text}</blockquote>

            <div className="hr" />

            {data.draft?.drafted ? (
              <>
                <div className="draft-head">
                  <span className="tag tag-accent">{t('draft.draftTag')}</span>
                  <span className="draft-tone">{t('draft.draftTone', { tone: data.draft.tone })}</span>
                </div>
                <p className="draft-text draft-text-lg">{data.draft.text}</p>
              </>
            ) : (
              <>
                <span className="tag tag-outline">{t('draft.refusedTag')}</span>
                <p className="draft-refusal">{t('draft.refusal')}</p>
                <p className="state-description">{data.draft?.reason}</p>
              </>
            )}

            <div className="state-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={send}
                disabled={!mayAct || !data.draft?.drafted || data.state === 'sent'}
              >
                {data.state === 'sent' ? t('draft.sent') : t('draft.approveAndSend')}
              </button>
              <button type="button" className="btn btn-secondary" disabled={!mayAct}>
                {t('draft.editText')}
              </button>
              <button type="button" className="btn btn-secondary" disabled={!mayAct}>
                {t('draft.regenerate')}
              </button>
              <button type="button" className="btn btn-ghost" disabled={!mayAct}>
                {t('draft.reject')}
              </button>
            </div>

            {notice ? (
              <p className="state-note" role="status">
                {notice}
              </p>
            ) : null}

            <p className="state-note">{t('draft.approvalNote')}</p>

            <button type="button" className="btn btn-ghost" onClick={() => onNavigate('/review')}>
              {t('draft.backToInbox')}
            </button>
          </>
        ) : null}
      </DataPanel>

      <div className="draft-side">
        <DataPanel
          status={panelStatus}
          kicker={t('draft.sourcesKicker')}
          loading={{ message: t('draft.sourcesLoading') }}
          empty={{ title: t('draft.sourcesEmpty') }}
          error={{ title: t('draft.sourcesError'), onRetry: reload }}
        >
          {data?.draft?.citations?.length ? (
            <ul className="source-list">
              {data.draft.citations.map((citation) => (
                <li key={`${citation.docId}-${citation.page}`}>
                  <Blueprint className="source-card">
                    <p className="source-title">
                      <FileText size={12} strokeWidth={1.5} aria-hidden="true" />
                      {citation.title} · {t('common.page', { page: citation.page })}
                    </p>
                    <p className="source-score">
                      {t('common.score', { score: fmt.number(citation.score) })}
                    </p>
                    <p className="source-quote">“{citation.quote}”</p>
                  </Blueprint>
                </li>
              ))}
            </ul>
          ) : (
            <p className="state-description">{t('draft.noSources')}</p>
          )}
        </DataPanel>

        <DataPanel
          status={panelStatus}
          kicker={t('draft.guardrailKicker')}
          meta={data?.guardrail ? <span className="panel-meta">{data.guardrail.summary}</span> : null}
          loading={{ message: t('draft.guardrailLoading') }}
          empty={{ title: t('draft.guardrailEmpty') }}
          error={{ title: t('draft.guardrailError'), onRetry: reload }}
        >
          {data?.guardrail ? (
            <ul className="guardrail-list">
              {data.guardrail.checks.map((check) => (
                <li key={check.name} className={check.passed ? 'is-pass' : 'is-fail'}>
                  <span className="guardrail-icon" aria-hidden="true">
                    {check.passed ? (
                      <Check size={13} strokeWidth={1.5} />
                    ) : (
                      <X size={13} strokeWidth={1.5} />
                    )}
                  </span>
                  <span className="guardrail-text">
                    <span className="guardrail-name">
                      {CHECK_LABEL_KEYS[check.name] ? t(CHECK_LABEL_KEYS[check.name]) : check.name}
                    </span>
                    <span className="guardrail-detail">{check.detail}</span>
                  </span>
                  <span className="guardrail-verdict">
                    {check.passed ? t('common.passed') : t('common.failed')}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </DataPanel>
      </div>
    </div>
  );
}
