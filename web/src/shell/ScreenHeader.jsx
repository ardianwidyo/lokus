import { Play } from 'lucide-react';

import { screenNumber, screenSubtitleKey, screenTitleKey } from '../app/screens.js';
import { LanguageSwitcher, useT } from '../i18n/index.js';
import { ThemeSwitcher } from '../theme/index.js';

/**
 * Sticky content header: kicker "LAYAR nn" · title 26px · right-aligned
 * subtitle (max 44ch) · primary "Jalankan agen".
 *
 * The agent-run action is hidden where a screen declares `showRunAgent: false`
 * — screen 01 has no tenant yet, so there is nothing to run against — and
 * where the caller says the current role may not run one.
 *
 * The language and theme switches are mounted here too, hidden by CSS above
 * 900px where the rail carries them. Below that the rail is gone, and a
 * control reachable on no screen is not a control (AC-8.1).
 */
export function ScreenHeader({ screen, onRunAgent = null, canRunAgent = true }) {
  const t = useT();

  return (
    <header className="screen-header">
      <div className="screen-heading">
        <span className="kicker">{t('shell.kicker', { number: screenNumber(screen) })}</span>
        <h1 className="screen-title">{t(screenTitleKey(screen))}</h1>
      </div>

      <p className="screen-subtitle">{t(screenSubtitleKey(screen))}</p>

      <LanguageSwitcher className="header-lang" />
      <ThemeSwitcher className="header-theme" />

      {screen.showRunAgent === false || !canRunAgent ? null : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRunAgent ?? undefined}
          disabled={!onRunAgent}
        >
          <Play size={14} strokeWidth={1.5} aria-hidden="true" />
          {t('shell.runAgent')}
        </button>
      )}
    </header>
  );
}
