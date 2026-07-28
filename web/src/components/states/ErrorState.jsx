/**
 * Error — "Gagal".
 *
 * Guideline shape: name the service that failed, say what the screen is showing
 * instead and when it will retry, then offer [Coba lagi] and [Lihat log]. The
 * worked example is:
 *
 *   "Places API tak menjawab" /
 *   "Skor lokasi memakai data tersimpan per 26 Juli. Percobaan ulang otomatis
 *    dalam 5 menit." / [Coba lagi] [Lihat log]
 *
 * Failing loudly is the point: the panel never silently shows stale numbers
 * without saying they are stale.
 */
export function ErrorState({
  title = 'Permintaan gagal',
  description = null,
  onRetry = null,
  onViewLog = null,
}) {
  return (
    <div className="state state-error" role="alert">
      <p className="state-title">{title}</p>
      {description ? <p className="state-description">{description}</p> : null}
      {onRetry || onViewLog ? (
        <div className="state-actions">
          {onRetry ? (
            <button type="button" className="btn btn-secondary" onClick={onRetry}>
              Coba lagi
            </button>
          ) : null}
          {onViewLog ? (
            <button type="button" className="btn btn-ghost" onClick={onViewLog}>
              Lihat log
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
