import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { screenSubtitleKey, screenTitleKey } from '../app/screens.js';
import { useT } from '../i18n/index.js';

/**
 * Every screen the shell can reach but no phase has filled in yet. It renders
 * a real DataPanel in its empty state rather than a blank page, so the four
 * required states are wired from the first commit and the screen says honestly
 * which phase builds it.
 */
export function PlaceholderScreen({ screen }) {
  const t = useT();

  return (
    <DataPanel
      status={PANEL_STATUS.EMPTY}
      kicker={t(`phase.${screen.phase}`)}
      title={t(screenTitleKey(screen))}
      empty={{
        title: t('placeholder.title'),
        description: t('placeholder.description', {
          subtitle: t(screenSubtitleKey(screen)),
          phase: screen.phase,
        }),
      }}
    />
  );
}
