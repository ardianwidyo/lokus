import { useT } from '../../i18n/index.js';

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
export function ErrorState({ title = null, description = null, onRetry = null, onViewLog = null }) {
  const t = useT();

  return (
    <div className="state state-error" role="alert">
      <p className="state-title">{title ?? t('state.errorDefault')}</p>
      {description ? <p className="state-description">{description}</p> : null}
      {onRetry || onViewLog ? (
        <div className="state-actions">
          {onRetry ? (
            <button type="button" className="btn btn-secondary" onClick={onRetry}>
              {t('state.retry')}
            </button>
          ) : null}
          {onViewLog ? (
            <button type="button" className="btn btn-ghost" onClick={onViewLog}>
              {t('state.viewLog')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
