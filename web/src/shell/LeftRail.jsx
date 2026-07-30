import { ChevronDown, House } from 'lucide-react';

import { SCREENS, screenNumber, screenRailLabelKey } from '../app/screens.js';
import { LanguageSwitcher, useLocale } from '../i18n/index.js';

/**
 * Left rail, 238px, from design/SCREENS.md "Shell (semua layar)":
 * lockup · tenant picker · "14 LAYAR" label · the 14 numbered items · language
 * switch · footer.
 */
export function LeftRail({ current, onNavigate, tenant = null }) {
  const { t } = useLocale();

  return (
    <nav className="rail" aria-label={t('shell.navLabel')}>
      <div className="rail-brand">
        <span className="rail-logo" aria-hidden="true">
          LOGO
        </span>
        <span className="rail-lockup">
          <span className="rail-name">LOKUS</span>
          <span className="rail-tagline">{t('shell.tagline')}</span>
        </span>
      </div>

      <TenantPicker tenant={tenant} />

      <p className="rail-kicker">{t('shell.screenCount')}</p>

      <ul className="rail-list">
        {SCREENS.map((screen) => {
          const isActive = screen.id === current.id;
          return (
            <li key={screen.id}>
              <a
                className={`rail-item${isActive ? ' is-active' : ''}`}
                href={screen.path}
                aria-current={isActive ? 'page' : undefined}
                onClick={(event) => {
                  // Let modified clicks open a new tab as a real link would.
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                  event.preventDefault();
                  onNavigate(screen.path);
                }}
              >
                <span className="rail-no">{screenNumber(screen)}</span>
                <span className="rail-label">{t(screenRailLabelKey(screen))}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="rail-lang">
        <LanguageSwitcher />
      </div>

      <p className="rail-foot">
        {t('shell.footPrototype')}
        <br />
        {t('shell.footLastCycle')}
      </p>
    </nav>
  );
}

function TenantPicker({ tenant }) {
  const { t, fmt } = useLocale();

  if (!tenant) {
    return (
      <p className="rail-tenant rail-tenant-empty">
        <House size={15} strokeWidth={1.5} aria-hidden="true" />
        <span className="rail-tenant-text">
          <span className="rail-tenant-name">{t('shell.noTenant')}</span>
          <span className="rail-tenant-meta">{t('shell.pickTenant')}</span>
        </span>
      </p>
    );
  }

  return (
    <div className="rail-tenant">
      <House size={15} strokeWidth={1.5} aria-hidden="true" />
      <span className="rail-tenant-text">
        <span className="rail-tenant-name">{tenant.name}</span>
        <span className="rail-tenant-meta">
          {t('shell.tenantMeta', { count: fmt.integer(tenant.outletCount), area: tenant.area })}
        </span>
      </span>
      <ChevronDown size={13} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}
