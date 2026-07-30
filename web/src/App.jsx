import { useEffect } from 'react';

import { SessionProvider, useSession } from './app/SessionContext.jsx';
import { useRoute } from './app/useRoute.js';
import { LocaleProvider } from './i18n/index.js';
import { ThemeProvider } from './theme/index.js';
import { AdminScreen } from './screens/AdminScreen.jsx';
import { ActionBoardScreen } from './screens/ActionBoardScreen.jsx';
import { BriefingScreen } from './screens/BriefingScreen.jsx';
import { ChatScreen } from './screens/ChatScreen.jsx';
import { CitedAnswerScreen } from './screens/CitedAnswerScreen.jsx';
import { KnowledgeScreen } from './screens/KnowledgeScreen.jsx';
import { CompareSitesScreen } from './screens/CompareSitesScreen.jsx';
import { SiteScoutScreen } from './screens/SiteScoutScreen.jsx';
import { NetworkMapScreen } from './screens/NetworkMapScreen.jsx';
import { MasukScreen } from './screens/MasukScreen.jsx';
import { OutletDetailScreen } from './screens/OutletDetailScreen.jsx';
import { PlaceholderScreen } from './screens/PlaceholderScreen.jsx';
import { ReplyDraftScreen } from './screens/ReplyDraftScreen.jsx';
import { ReviewInboxScreen } from './screens/ReviewInboxScreen.jsx';
import { ThemeAnalysisScreen } from './screens/ThemeAnalysisScreen.jsx';
import { AppShell } from './shell/AppShell.jsx';

/**
 * Sources are injectable so tests can drive every state of every panel.
 *
 * `LocaleProvider` wraps `SessionProvider` here rather than in `main.jsx`, so
 * that a test rendering `<App>` alone — every existing screen test does — gets
 * the language context `SessionContext` now depends on, without every test file
 * needing its own wrapper. `ThemeProvider` sits outside it for the same reason
 * `LocaleProvider` does: the theme is the reader's, not the tenant's.
 */
export function App({
  sessionSource = null,
  reputationSource = null,
  agentSource = null,
  briefingSource = null,
  adminSource = null,
  locationSource = null,
  outletSource = null,
  knowledgeSource = null,
  env = undefined,
  initialLocale = null,
  initialTheme = null,
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <LocaleProvider initialLocale={initialLocale}>
        <SessionProvider
          source={sessionSource}
          reputationSource={reputationSource}
          agentSource={agentSource}
          briefingSource={briefingSource}
          adminSource={adminSource}
          locationSource={locationSource}
          outletSource={outletSource}
          knowledgeSource={knowledgeSource}
          {...(env ? { env } : {})}
        >
          <Console />
        </SessionProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

/** Screens that have been built; the rest fall through to the placeholder. */
const SCREEN_COMPONENTS = {
  masuk: MasukScreen,
  review: ReviewInboxScreen,
  draft: ReplyDraftScreen,
  tema: ThemeAnalysisScreen,
  chat: ChatScreen,
  briefing: BriefingScreen,
  tindakan: ActionBoardScreen,
  admin: AdminScreen,
  peta: NetworkMapScreen,
  cabang: OutletDetailScreen,
  'site-scout': SiteScoutScreen,
  bandingkan: CompareSitesScreen,
  pengetahuan: KnowledgeScreen,
  jawaban: CitedAnswerScreen,
};

function Console() {
  const { screen, path, query, navigate } = useRoute();
  const { tenant, role } = useSession();

  // Arriving without a tenant is not a fault, it is someone who has not chosen
  // yet — so the console asks, instead of rendering every panel's error state.
  // Where they were heading travels in the URL so it survives a reload.
  useEffect(() => {
    if (tenant || screen.id === 'masuk') return;

    const search = query.toString();
    const intended = search ? `${path}?${search}` : path;
    navigate(`/masuk?next=${encodeURIComponent(intended)}`);
  }, [tenant, screen.id, path, query, navigate]);

  const Screen = SCREEN_COMPONENTS[screen.id];

  // Mounting the screen while the redirect above is still pending would let it
  // fire its first request without a tenant — one guaranteed 400 and a console
  // error on every deep link. The shell stays so nothing flashes.
  const redirecting = !tenant && screen.id !== 'masuk';

  return (
    <AppShell screen={screen} onNavigate={navigate} tenant={tenant} role={role}>
      {redirecting ? null : Screen ? (
        <Screen onNavigate={navigate} screen={screen} reviewId={query.get('review')} query={query} />
      ) : (
        <PlaceholderScreen screen={screen} />
      )}
    </AppShell>
  );
}
