import { Play } from 'lucide-react';

import { screenNumber } from '../app/screens.js';

/**
 * Sticky content header: kicker "LAYAR nn" · title 26px · right-aligned
 * subtitle (max 44ch) · primary "Jalankan agen".
 *
 * The agent-run action is hidden where a screen declares `showRunAgent: false`
 * — screen 01 has no tenant yet, so there is nothing to run against.
 */
export function ScreenHeader({ screen, onRunAgent = null }) {
  return (
    <header className="screen-header">
      <div className="screen-heading">
        <span className="kicker">Layar {screenNumber(screen)}</span>
        <h1 className="screen-title">{screen.title}</h1>
      </div>

      <p className="screen-subtitle">{screen.subtitle}</p>

      {screen.showRunAgent === false ? null : (
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
