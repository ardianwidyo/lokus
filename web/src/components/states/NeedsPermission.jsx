import { useT } from '../../i18n/index.js';

/**
 * Needs permission — "Perlu izin".
 *
 * Distinct from Error on purpose: nothing is broken, LOKUS simply has not been
 * granted the scope yet. Guideline example:
 *
 *   "Hubungkan Business Profile" /
 *   "LOKUS butuh akses baca review dan tulis balasan untuk 42 lokasi milik
 *    Anda." / [Hubungkan akun]
 *
 * A viewer sees this state without the connect button: granting access is a
 * write, and viewers are read-only (AC-6.3).
 */
export function NeedsPermission({
  title = null,
  description = null,
  actionLabel = null,
  onConnect = null,
  canConnect = true,
}) {
  const t = useT();

  return (
    <div className="state state-permission" role="status" aria-live="polite">
      <p className="state-title">{title ?? t('state.permissionDefault')}</p>
      {description ? <p className="state-description">{description}</p> : null}
      {onConnect && canConnect ? (
        <div className="state-actions">
          <button type="button" className="btn btn-primary" onClick={onConnect}>
            {actionLabel ?? t('state.connect')}
          </button>
        </div>
      ) : null}
      {onConnect && !canConnect ? (
        <p className="state-note">{t('state.readOnlyConnect')}</p>
      ) : null}
    </div>
  );
}
