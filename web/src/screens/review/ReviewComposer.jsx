import { useMemo, useState } from 'react';

import { outletsForTenant } from '@lokus/core';

import { useSession } from '../../app/SessionContext.jsx';
import { Blueprint } from '../../components/Blueprint.jsx';
import { useLocale } from '../../i18n/index.js';

const RATINGS = [1, 2, 3, 4, 5];

/**
 * The demo composer under the inbox list.
 *
 * A seeded dataset can show that the clusterer works; it cannot show that the
 * clusterer *reads*, because every row it groups was written to be grouped that
 * way. One complaint typed in the room, and the theme found from it, settles
 * that in a way 713 seeded reviews cannot.
 *
 * It is deliberately not disguised as a Google import. The row it produces
 * carries a demo tag everywhere it appears, and this panel says where the text
 * came from — a console that quietly presented typed text as a Google review
 * would be lying about the one thing the whole product rests on (AC-10.6).
 *
 * Shown when the source can actually add a review, which both the seeded
 * workspace and the API now can. The gate is the capability rather than the
 * mode: it was `isSeeded` for an afternoon, which hid the composer from the
 * one mode where the model is real — and the whole point of typing a complaint
 * in the room is watching the clusterer read it and the drafter answer it.
 *
 * A gate on the capability also cannot drift. Whatever a future source is, if
 * it cannot add a review the button is not offered, and the failure the API
 * mode first produced — `reputation.addReview is not a function` — has no way
 * back.
 */
export function ReviewComposer({ onAdded }) {
  const { reputation, tenant, canResetSeededData, resetSeededData, dataChanged } = useSession();
  const { t, errorText } = useLocale();

  const [open, setOpen] = useState(false);
  const [outletId, setOutletId] = useState('BKS-02');
  const [rating, setRating] = useState(2);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [failure, setFailure] = useState(null);

  const tenantId = tenant?.tenantId ?? 'nusa-retail';
  const outlets = useMemo(() => outletsForTenant(tenantId), [tenantId]);

  // After the hooks, never before them: an early return above `useMemo` would
  // change the hook order between the two modes.
  if (typeof reputation?.addReview !== 'function') return null;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setFailure(null);
    setReceipt(null);

    try {
      const review = await reputation.addReview({
        outletId,
        rating: Number(rating),
        author: author.trim(),
        text: text.trim(),
      });

      setReceipt(t('review.addReceipt', { id: review.id }));
      setText('');
      setAuthor('');
      // The inbox first, then every other screen holding a cached read of the
      // same rows — the theme matrix and the branch rating among them.
      onAdded?.(review);
      dataChanged?.();
    } catch (error) {
      // The adapter's own refusal, not a rewritten one: an outlet LOKUS may not
      // reply to should explain itself here the way it does everywhere else.
      setFailure(errorText(error, 'review.addFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="composer-toggle">
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
          {t('review.addOpen')}
        </button>
      </div>
    );
  }

  return (
    <Blueprint className="review-composer">
      <span className="kicker">{t('review.addKicker')}</span>
      <p className="state-note">{t('review.addNote')}</p>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="add-outlet">{t('review.addOutletLabel')}</label>
          <select
            id="add-outlet"
            className="input"
            value={outletId}
            onChange={(event) => setOutletId(event.target.value)}
          >
            {outlets.map((outlet) => (
              <option key={outlet.outletId} value={outlet.outletId}>
                {outlet.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="add-rating">{t('review.addRatingLabel')}</label>
          <select
            id="add-rating"
            className="input"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
          >
            {RATINGS.map((value) => (
              <option key={value} value={value}>
                {t('common.stars', { rating: value })}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="add-author">{t('review.addAuthorLabel')}</label>
          <input
            id="add-author"
            className="input"
            value={author}
            placeholder={t('review.addAuthorPlaceholder')}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="add-text">{t('review.addTextLabel')}</label>
          <textarea
            id="add-text"
            className="input"
            rows={3}
            value={text}
            placeholder={t('review.addTextPlaceholder')}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        <div className="state-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
            {busy ? t('review.addWorking') : t('review.addSubmit')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
            {t('review.addClose')}
          </button>
          {canResetSeededData ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                setReceipt(t('kb.resetDone'));
                setFailure(null);
                resetSeededData();
              }}
            >
              {t('kb.reset')}
            </button>
          ) : null}
        </div>
      </form>

      {receipt ? (
        <p className="state-note" role="status">
          {receipt}
        </p>
      ) : null}
      {failure ? (
        <p className="state-note" role="alert">
          {failure}
        </p>
      ) : null}
    </Blueprint>
  );
}
