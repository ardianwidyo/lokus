/**
 * The 14 screens, in rail order.
 *
 * Titles, subtitles and rail labels are *not* here: they live in
 * `web/src/i18n/messages.*.js` under `screen.<id>`, because since US-8 there are
 * two of each and a copy in this file would be a second source of truth for one
 * of them. The Indonesian side of that pair is still copied verbatim from
 * design/SCREENS.md — that document remains final.
 *
 * `phase` is the phase from specs/001-lokus-core/plan.md that fills the screen
 * in; the shell uses it to say honestly what is not built yet.
 */
export const SCREENS = Object.freeze([
  {
    id: 'masuk',
    path: '/masuk',
    phase: 'P0',
    // No tenant is selected yet, so there is nothing to run an agent against.
    showRunAgent: false,
  },
  { id: 'briefing', path: '/briefing', phase: 'P4' },
  { id: 'peta', path: '/peta', phase: 'P3' },
  { id: 'cabang', path: '/cabang', phase: 'P3' },
  { id: 'review', path: '/review', phase: 'P1' },
  { id: 'draft', path: '/draft', phase: 'P1' },
  { id: 'tema', path: '/tema', phase: 'P1' },
  { id: 'site-scout', path: '/site-scout', phase: 'P3' },
  { id: 'bandingkan', path: '/bandingkan', phase: 'P3' },
  { id: 'chat', path: '/chat', phase: 'P4' },
  { id: 'pengetahuan', path: '/pengetahuan', phase: 'P2' },
  { id: 'jawaban', path: '/jawaban', phase: 'P2' },
  { id: 'tindakan', path: '/tindakan', phase: 'P4' },
  { id: 'admin', path: '/admin', phase: 'P5' },
]);

/** Two-digit screen number, as the rail and the header kicker show it. */
export function screenNumber(screen) {
  return String(SCREENS.findIndex((entry) => entry.id === screen.id) + 1).padStart(2, '0');
}

/** The dictionary keys for one screen's copy. */
export function screenTitleKey(screen) {
  return `screen.${screen.id}.title`;
}

export function screenSubtitleKey(screen) {
  return `screen.${screen.id}.subtitle`;
}

export function screenRailLabelKey(screen) {
  return `screen.${screen.id}.railLabel`;
}

export function findScreenByPath(path) {
  return SCREENS.find((screen) => screen.path === path) ?? null;
}

export const DEFAULT_PATH = SCREENS[0].path;

/**
 * Below 900px the rail becomes a four-item bottom nav
 * (design/UI-GUIDELINES.md, "Responsif").
 */
export const BOTTOM_NAV_IDS = Object.freeze(['briefing', 'peta', 'review', 'chat']);
