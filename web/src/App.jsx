import { useRoute } from './app/useRoute.js';
import { PlaceholderScreen } from './screens/PlaceholderScreen.jsx';
import { AppShell } from './shell/AppShell.jsx';

export function App() {
  const { screen, navigate } = useRoute();

  return (
    <AppShell screen={screen} onNavigate={navigate}>
      <PlaceholderScreen screen={screen} />
    </AppShell>
  );
}
