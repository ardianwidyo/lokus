import { useCallback, useEffect, useMemo, useState } from 'react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { ListingNotice } from '../components/ListingNotice.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { useLocale } from '../i18n/index.js';
import { DraftBlock } from './review/DraftBlock.jsx';
import { ReviewComposer } from './review/ReviewComposer.jsx';
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
  // The first three are workflow stages; this one is an origin, so a review
  // shows up here as well as in the stage it reached. It stays visible at zero:
  // zero is the true answer to "what have I put in", and a segment that only
  // appears after the first added review hides that question until too late
  // (AC-10.10).
  { id: 'ditambahkan', labelKey: 'review.bucketAdded' },
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
        {/* The list panel and the composer share a column. The composer sits
            outside the panel because a DataPanel swaps its children out for the
            loading state, and the reload that follows an add would unmount the
            composer mid-receipt — taking the confirmation of the thing that
            just happened with it. */}
        <div className="inbox-list-column">
          <DataPanel
            status={rows.length === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status}
            className="inbox-list-panel"
            kicker={t('review.kicker', {
              count: data?.counts?.[bucket] ?? 0,
              bucket: t(activeBucket.labelKey).toLowerCase(),
            })}
            meta={
              <span className="panel-meta">
                {t('review.metaPriority')}
                {/* Part of the count above needs a connection, not a reply. Saying
                    so here keeps "perlu tindakan" from implying every row is one
                    click from an answer (AC-9.4). */}
                {data?.needsConnection
                  ? ` · ${t('review.metaNeedsConnection', { count: data.needsConnection })}`
                  : ''}
              </span>
            }
            loading={{ message: t('review.loading') }}
            // An empty "ditambahkan" means nothing has been handed to the
            // console yet, which is a different fact from an inbox that has
            // been cleared — and the copy for the second one would read as a
            // congratulation nobody earned.
            empty={{
              title: t(bucket === 'ditambahkan' ? 'review.addedEmptyTitle' : 'review.emptyTitle'),
              description: t(
                bucket === 'ditambahkan' ? 'review.addedEmptyDescription' : 'review.emptyDescription',
              ),
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

          {/* Selecting the new row is the point of adding one: a presenter should
              not have to hunt for what they just typed. */}
          <ReviewComposer
            onAdded={async (review) => {
              await reload();
              setSelectedId(review.id);
            }}
          />
        </div>

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
              {/* The channel is named rather than assumed: a row added in the
                  demo did not come from Google, and this line is where a reader
                  looks to find out where it did come from (AC-10.6). */}
              <p className="review-meta">
                {detail.review.addedInSession
                  ? t('review.reviewMetaDemo', {
                      author: detail.review.author,
                      relative: detail.review.relative,
                    })
                  : t('review.reviewMeta', {
                      author: detail.review.author,
                      relative: detail.review.relative,
                    })}
              </p>
              <Stars rating={detail.review.rating} />
              <blockquote className="review-quote">{detail.review.text}</blockquote>

              <DraftBlock draft={detail.draft} />

              {/* AC-9.4: the send is withheld here rather than failing when it
                  is pressed. The draft above still renders — it becomes valid
                  the moment the listing is connected, so throwing it away
                  would lose work that is already done. */}
              {detail.listing && !detail.listing.canReply ? (
                <ListingNotice
                  listing={detail.listing}
                  outletName={detail.review.outletName}
                />
              ) : (
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
              )}

              {/* AC-9.6: five is Google's ceiling, not the branch's total. */}
              {detail.listing?.reviewCeiling ? (
                <p className="state-note">
                  {t('listing.ceilingNote', { count: detail.listing.reviewCeiling })}
                </p>
              ) : null}

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
