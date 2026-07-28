import { ROLES } from '../app/roles.js';
import { BottomNav } from './BottomNav.jsx';
import { LeftRail } from './LeftRail.jsx';
import { ScreenHeader } from './ScreenHeader.jsx';

/** Rail + sticky header + scrolling content column, on every one of the 14 screens. */
export function AppShell({ screen, onNavigate, tenant = null, role = null, onRunAgent = null, children }) {
  // Running an agent writes data, so a viewer never sees the control (AC-6.3).
  // Before a tenant is chosen there is no role yet, and the shell stays neutral.
  const canRunAgent = role !== ROLES.VIEWER;

  return (
    <div className="shell">
      <LeftRail current={screen} onNavigate={onNavigate} tenant={tenant} />

      <main className="main">
        <ScreenHeader screen={screen} onRunAgent={onRunAgent} canRunAgent={canRunAgent} />
        <div className="screen-body">{children}</div>
      </main>

      <BottomNav current={screen} onNavigate={onNavigate} />
    </div>
  );
}
