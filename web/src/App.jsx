import { SessionProvider, useSession } from './app/SessionContext.jsx';
import { useRoute } from './app/useRoute.js';
import { MasukScreen } from './screens/MasukScreen.jsx';
import { PlaceholderScreen } from './screens/PlaceholderScreen.jsx';
import { AppShell } from './shell/AppShell.jsx';

/** `sessionSource` is injectable so tests can drive every state of the panel. */
export function App({ sessionSource = null }) {
  return (
    <SessionProvider source={sessionSource}>
      <Console />
    </SessionProvider>
  );
}

function Console() {
  const { screen, navigate } = useRoute();
  const { tenant, role } = useSession();

  return (
    <AppShell screen={screen} onNavigate={navigate} tenant={tenant} role={role}>
      {screen.id === 'masuk' ? (
        <MasukScreen onNavigate={navigate} />
      ) : (
        <PlaceholderScreen screen={screen} />
      )}
    </AppShell>
  );
}
