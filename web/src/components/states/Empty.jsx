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
export function Empty({
  title = 'Belum ada data',
  description = null,
  actionLabel = 'Periksa sekarang',
  onAction = null,
}) {
  return (
    <div className="state state-empty" role="status" aria-live="polite">
      <p className="state-title">{title}</p>
      {description ? <p className="state-description">{description}</p> : null}
      {onAction ? (
        <div className="state-actions">
          <button type="button" className="btn btn-secondary" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
