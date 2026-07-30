import { useCallback, useEffect, useMemo, useState } from 'react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { useLocale } from '../i18n/index.js';
import { DraftBlock } from './review/DraftBlock.jsx';
import { ReviewList, Stars } from './review/ReviewList.jsx';

/**
 * The bucket ids are stored values shared with the API, so they stay Indonesian
 * in both languages — `?bucket=perlu-tindakan` is a contract, not copy. Only the
 * labels follow the reader.
 */
const BUCKETS = [
  { id: 'perlu-tindakan', labelKey: 'review.bucketNeedsAction' },
  { id: 'draft-siap', labelKey: 'review.bucketDraftReady' },
  { id: 'terkirim', labelKey: 'review.bucketSent' },
];

/**
 * Screen 05 · Kotak masuk review.
 *
 * 320px list beside a preview panel. Every count in the segmented control is
 * computed from the review rows, not written into the markup.
 */
export function ReviewInboxScreen({ onNavigate }) {
  const { reputation, role, tenant } = useSession();
  const { t, errorText } = useLocale();
  const [bucket, setBucket] = useState('perlu-tindakan');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadInbox = useCallback(() => reputation.inbox({ bucket }), [reputation, bucket]);
  const { status, data, error, reload } = useAsyncData(loadInbox);

  // Memoised: this array is an effect dependency, and a fresh [] on every
  // render would re-run the selection effect forever.
  const rows = useMemo(() => data?.rows ?? [], [data]);

  // Selecting the first row is the screen's resting state; it must follow the
  // bucket rather than stick to a row that is no longer listed.
  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!rows.some((row) => row.id === selectedId)) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedId) {
      setDetail(null);
      return undefined;
    }
    reputation.reviewDetail(selectedId).then((result) => {
      if (!cancelled) setDetail(result);
    });
    return () => {
      cancelled = true;
    };
  }, [reputation, selectedId]);

  const mayAct = canWrite(role);

  const approve = async (reviewId) => {
    if (!mayAct || !reviewId) return;
    try {
      await reputation.approveAndSend({
        reviewId,
        approvedBy: tenant?.approverEmail ?? 'manajer@nusaretail.co.id',
        role,
      });
      setNotice(t('review.replySent'));
      await reload();
    } catch (failure) {
      setNotice(errorText(failure, 'review.replyFailed'));
    }
  };

  const activeBucket = BUCKETS.find((entry) => entry.id === bucket);

  return (
    <>
      <div className="inbox-filters">
        {/* Radio inputs, so the control announces itself as a radiogroup —
            a tablist would promise arrow-key semantics these do not have. */}
        <div className="seg" role="radiogroup" aria-label={t('review.filterLabel')}>
          {BUCKETS.map((entry) => (
            <label key={entry.id} className="seg-opt">
              <input
                type="radio"
                name="bucket"
                checked={bucket === entry.id}
                onChange={() => setBucket(entry.id)}
              />
              {t(entry.labelKey)} · {data?.counts?.[entry.id] ?? '—'}
            </label>
          ))}
        </div>
      </div>

      <div className="inbox-grid">
        <DataPanel
          status={rows.length === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status}
          className="inbox-list-panel"
          kicker={t('review.kicker', {
            count: data?.counts?.[bucket] ?? 0,
            bucket: t(activeBucket.labelKey).toLowerCase(),
          })}
          meta={<span className="panel-meta">{t('review.metaPriority')}</span>}
          loading={{ message: t('review.loading') }}
          empty={{
            title: t('review.emptyTitle'),
            description: t('review.emptyDescription'),
            onAction: reload,
          }}
          error={{
            title: t('review.errorTitle'),
            description: errorText(error, 'review.errorFallback'),
            onRetry: reload,
          }}
        >
          <ReviewList
            rows={rows}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onApprove={approve}
            onEdit={(id) => onNavigate?.(`/draft?review=${id}`)}
          />
          <p className="inbox-hint">{t('review.hint')}</p>
        </DataPanel>

        <DataPanel
          status={detail ? PANEL_STATUS.READY : status}
          className="inbox-preview-panel"
          kicker={
            detail
              ? t('review.previewKicker', { outlet: detail.review.outletName })
              : t('review.previewKickerPlain')
          }
          loading={{ message: t('review.previewLoading') }}
          empty={{
            title: t('review.previewEmptyTitle'),
            description: t('review.previewEmptyDescription'),
          }}
          error={{ title: t('review.previewErrorTitle'), onRetry: reload }}
        >
          {detail ? (
            <>
              <p className="review-meta">
                {t('review.reviewMeta', {
                  author: detail.review.author,
                  relative: detail.review.relative,
                })}
              </p>
              <Stars rating={detail.review.rating} />
              <blockquote className="review-quote">{detail.review.text}</blockquote>

              <DraftBlock draft={detail.draft} />

              <div className="state-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => approve(selectedId)}
                  disabled={!mayAct || !detail.draft?.drafted || detail.state === 'sent'}
                >
                  {detail.state === 'sent' ? t('review.sent') : t('review.approveAndSend')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!mayAct}
                  onClick={() => onNavigate?.(`/draft?review=${selectedId}`)}
                >
                  {t('review.editText')}
                </button>
                <button type="button" className="btn btn-secondary" disabled={!mayAct}>
                  {t('review.makeTicket')}
                </button>
                <button type="button" className="btn btn-ghost" disabled={!mayAct}>
                  {t('review.dismiss')}
                </button>
              </div>

              {!mayAct ? <p className="state-note">{t('common.readOnlyApproveReply')}</p> : null}
              {notice ? (
                <p className="state-note" role="status">
                  {notice}
                </p>
              ) : null}

              <p className="inbox-foot">
                <span>{detail.guardrail?.summary ?? t('review.guardrailNotRun')}</span>
                <span className="inbox-foot-right">
                  {t('review.remaining', { count: Math.max(0, rows.length - 1) })}
                </span>
              </p>
            </>
          ) : null}
        </DataPanel>
      </div>
    </>
  );
}
