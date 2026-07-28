import { BottomNav } from './BottomNav.jsx';
import { LeftRail } from './LeftRail.jsx';
import { ScreenHeader } from './ScreenHeader.jsx';

/** Rail + sticky header + scrolling content column, on every one of the 14 screens. */
export function AppShell({ screen, onNavigate, tenant = null, onRunAgent = null, children }) {
  return (
    <div className="shell">
      <LeftRail current={screen} onNavigate={onNavigate} tenant={tenant} />

      <main className="main">
        <ScreenHeader screen={screen} onRunAgent={onRunAgent} />
        <div className="screen-body">{children}</div>
      </main>

      <BottomNav current={screen} onNavigate={onNavigate} />
    </div>
  );
}
