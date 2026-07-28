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
  title = 'Perlu izin akses',
  description = null,
  actionLabel = 'Hubungkan akun',
  onConnect = null,
  canConnect = true,
}) {
  return (
    <div className="state state-permission" role="status" aria-live="polite">
      <p className="state-title">{title}</p>
      {description ? <p className="state-description">{description}</p> : null}
      {onConnect && canConnect ? (
        <div className="state-actions">
          <button type="button" className="btn btn-primary" onClick={onConnect}>
            {actionLabel}
          </button>
        </div>
      ) : null}
      {onConnect && !canConnect ? (
        <p className="state-note">
          Peran Anda hanya bisa membaca. Minta admin tenant untuk menghubungkan akun.
        </p>
      ) : null}
    </div>
  );
}
