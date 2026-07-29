import { SessionProvider, useSession } from './app/SessionContext.jsx';
import { useRoute } from './app/useRoute.js';
import { MasukScreen } from './screens/MasukScreen.jsx';
import { PlaceholderScreen } from './screens/PlaceholderScreen.jsx';
import { ReviewInboxScreen } from './screens/ReviewInboxScreen.jsx';
import { AppShell } from './shell/AppShell.jsx';

/** Sources are injectable so tests can drive every state of every panel. */
export function App({ sessionSource = null, reputationSource = null }) {
  return (
    <SessionProvider source={sessionSource} reputationSource={reputationSource}>
      <Console />
    </SessionProvider>
  );
}

/** Screens that have been built; the rest fall through to the placeholder. */
const SCREEN_COMPONENTS = {
  masuk: MasukScreen,
  review: ReviewInboxScreen,
};

function Console() {
  const { screen, navigate } = useRoute();
  const { tenant, role } = useSession();

  const Screen = SCREEN_COMPONENTS[screen.id];

  return (
    <AppShell screen={screen} onNavigate={navigate} tenant={tenant} role={role}>
      {Screen ? <Screen onNavigate={navigate} screen={screen} /> : <PlaceholderScreen screen={screen} />}
    </AppShell>
  );
}
