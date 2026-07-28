import { ChevronDown, House } from 'lucide-react';

import { SCREENS, screenNumber } from '../app/screens.js';

/**
 * Left rail, 238px, from design/SCREENS.md "Shell (semua layar)":
 * lockup · tenant picker · "14 LAYAR" label · the 14 numbered items · footer.
 *
 * The tenant picker is inert until screen 01 selects a tenant (T005); it shows
 * the active tenant and nothing else in this phase.
 */
export function LeftRail({ current, onNavigate, tenant = null }) {
  return (
    <nav className="rail" aria-label="Navigasi layar">
      <div className="rail-brand">
        <span className="rail-logo" aria-hidden="true">
          LOGO
        </span>
        <span className="rail-lockup">
          <span className="rail-name">LOKUS</span>
          <span className="rail-tagline">Local Ops Intelligence</span>
        </span>
      </div>

      <TenantPicker tenant={tenant} />

      <p className="rail-kicker">14 layar</p>

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
                <span className="rail-label">{screen.railLabel}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <p className="rail-foot">
        Prototipe desain · data contoh
        <br />
        Siklus agen terakhir 06.00 WIB
      </p>
    </nav>
  );
}

function TenantPicker({ tenant }) {
  if (!tenant) {
    return (
      <p className="rail-tenant rail-tenant-empty">
        <House size={15} strokeWidth={1.5} aria-hidden="true" />
        <span className="rail-tenant-text">
          <span className="rail-tenant-name">Belum ada tenant</span>
          <span className="rail-tenant-meta">Pilih tenant di layar 01</span>
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
          {tenant.outletCount} cabang · {tenant.area}
        </span>
      </span>
      <ChevronDown size={13} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}
