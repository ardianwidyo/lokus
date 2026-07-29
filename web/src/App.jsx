import { SessionProvider, useSession } from './app/SessionContext.jsx';
import { useRoute } from './app/useRoute.js';
import { AdminScreen } from './screens/AdminScreen.jsx';
import { ActionBoardScreen } from './screens/ActionBoardScreen.jsx';
import { BriefingScreen } from './screens/BriefingScreen.jsx';
import { ChatScreen } from './screens/ChatScreen.jsx';
import { MasukScreen } from './screens/MasukScreen.jsx';
import { PlaceholderScreen } from './screens/PlaceholderScreen.jsx';
import { ReplyDraftScreen } from './screens/ReplyDraftScreen.jsx';
import { ReviewInboxScreen } from './screens/ReviewInboxScreen.jsx';
import { ThemeAnalysisScreen } from './screens/ThemeAnalysisScreen.jsx';
import { AppShell } from './shell/AppShell.jsx';

/** Sources are injectable so tests can drive every state of every panel. */
export function App({
  sessionSource = null,
  reputationSource = null,
  agentSource = null,
  briefingSource = null,
  adminSource = null,
}) {
  return (
    <SessionProvider
      source={sessionSource}
      reputationSource={reputationSource}
      agentSource={agentSource}
      briefingSource={briefingSource}
      adminSource={adminSource}
    >
      <Console />
    </SessionProvider>
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
};

function Console() {
  const { screen, query, navigate } = useRoute();
  const { tenant, role } = useSession();

  const Screen = SCREEN_COMPONENTS[screen.id];

  return (
    <AppShell screen={screen} onNavigate={navigate} tenant={tenant} role={role}>
      {Screen ? (
        <Screen onNavigate={navigate} screen={screen} reviewId={query.get('review')} />
      ) : (
        <PlaceholderScreen screen={screen} />
      )}
    </AppShell>
  );
}
