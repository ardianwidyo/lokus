import { Play } from 'lucide-react';

import { screenNumber } from '../app/screens.js';

/**
 * Sticky content header: kicker "LAYAR nn" · title 26px · right-aligned
 * subtitle (max 44ch) · primary "Jalankan agen".
 *
 * The agent-run action is hidden where a screen declares `showRunAgent: false`
 * — screen 01 has no tenant yet, so there is nothing to run against — and
 * where the caller says the current role may not run one.
 */
export function ScreenHeader({ screen, onRunAgent = null, canRunAgent = true }) {
  return (
    <header className="screen-header">
      <div className="screen-heading">
        <span className="kicker">Layar {screenNumber(screen)}</span>
        <h1 className="screen-title">{screen.title}</h1>
      </div>

      <p className="screen-subtitle">{screen.subtitle}</p>

      {screen.showRunAgent === false || !canRunAgent ? null : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRunAgent ?? undefined}
          disabled={!onRunAgent}
        >
          <Play size={14} strokeWidth={1.5} aria-hidden="true" />
          Jalankan agen
        </button>
      )}
    </header>
  );
}
