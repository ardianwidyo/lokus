/**
 * Loading — "Memuat".
 *
 * design/UI-GUIDELINES.md: three skeleton bars at 70% / 92% / 48%, 11px tall,
 * on --color-neutral-200, above a line saying what the agent is doing.
 *
 * The example line in the guidelines is "Agen sedang membaca 18 review…". The
 * count belongs to the caller: a number rendered here would be a decorative
 * number with no source, which the guidelines forbid.
 */

const SKELETON_WIDTHS = ['70%', '92%', '48%'];

export function Loading({ message = 'Agen sedang membaca data…' }) {
  return (
    <div className="state state-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="skeleton" aria-hidden="true">
        {SKELETON_WIDTHS.map((width) => (
          <span key={width} className="skeleton-bar" style={{ width }} />
        ))}
      </div>
      <p className="state-description">{message}</p>
    </div>
  );
}
