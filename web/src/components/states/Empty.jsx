import { useT } from '../../i18n/index.js';

/**
 * Empty — "Kosong".
 *
 * Guideline shape: title, one sentence explaining when the agent will look
 * again, and a single action. The worked example is:
 *
 *   "Tidak ada review baru" /
 *   "Semua review pekan ini sudah dibalas. Agen akan memeriksa lagi malam ini
 *    pukul 23.00." / [Periksa sekarang]
 *
 * Screens pass their own copy from design/SCREENS.md; the defaults here carry
 * no counts or dates, because an unsourced number is a bug (constitution I).
 */
export function Empty({ title = null, description = null, actionLabel = null, onAction = null }) {
  const t = useT();

  return (
    <div className="state state-empty" role="status" aria-live="polite">
      <p className="state-title">{title ?? t('state.emptyDefault')}</p>
      {description ? <p className="state-description">{description}</p> : null}
      {onAction ? (
        <div className="state-actions">
          <button type="button" className="btn btn-secondary" onClick={onAction}>
            {actionLabel ?? t('state.emptyAction')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
