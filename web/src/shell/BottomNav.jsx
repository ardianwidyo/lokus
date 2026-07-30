import { Bot, Inbox, Map, Sunrise } from 'lucide-react';

import { BOTTOM_NAV_IDS, SCREENS } from '../app/screens.js';
import { useT } from '../i18n/index.js';

/**
 * Below 900px the rail collapses to four items, 60px tall, 19px icons with a
 * 10px label (design/UI-GUIDELINES.md "Responsif"). Touch targets are ≥ 44px,
 * enforced in shell.css rather than here.
 */
const ICONS = {
  briefing: Sunrise,
  peta: Map,
  review: Inbox,
  chat: Bot,
};

export function BottomNav({ current, onNavigate }) {
  const t = useT();
  const items = BOTTOM_NAV_IDS.map((id) => SCREENS.find((screen) => screen.id === id));

  return (
    <nav className="bottom-nav" aria-label={t('shell.bottomNavLabel')}>
      {items.map((screen) => {
        const Icon = ICONS[screen.id];
        const isActive = screen.id === current.id;
        return (
          <a
            key={screen.id}
            className={`bottom-nav-item${isActive ? ' is-active' : ''}`}
            href={screen.path}
            aria-current={isActive ? 'page' : undefined}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              onNavigate(screen.path);
            }}
          >
            <Icon size={19} strokeWidth={1.5} aria-hidden="true" />
            <span className="bottom-nav-label">{t(`bottomNav.${screen.id}`)}</span>
          </a>
        );
      })}
    </nav>
  );
}
