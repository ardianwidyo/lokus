import { DataPanel, PANEL_STATUS } from '../components/states/index.js';

/**
 * Every screen the shell can reach but no phase has filled in yet. It renders
 * a real DataPanel in its empty state rather than a blank page, so the four
 * required states are wired from the first commit and the screen says honestly
 * which phase builds it.
 */
const PHASE_NAMES = {
  P1: 'P1 · Reputasi',
  P2: 'P2 · Pengetahuan',
  P3: 'P3 · Lokasi',
  P4: 'P4 · Orkestrasi',
  P5: 'P5 · Pengerasan',
};

export function PlaceholderScreen({ screen }) {
  return (
    <DataPanel
      status={PANEL_STATUS.EMPTY}
      kicker={PHASE_NAMES[screen.phase] ?? screen.phase}
      title={screen.title}
      empty={{
        title: 'Layar ini belum dibangun',
        description: `${screen.subtitle} Panel akan terisi pada fase ${screen.phase}.`,
      }}
    />
  );
}
