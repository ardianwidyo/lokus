/**
 * The demo runs against a fixed instant so every relative label ("2 jam lalu",
 * "8 pekan") is reproducible and every screenshot matches. design/SCREENS.md
 * dates the briefing "Selasa, 28 Juli 2026 · 06.00"; the console is viewed two
 * hours later.
 *
 * Production passes a real clock; nothing below reads `Date.now()` directly.
 */
export const DEMO_NOW = new Date('2026-07-28T08:00:00+07:00');

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/** Weeks are counted back from `now`; week 8 is the seven days ending now. */
export const TREND_WEEKS = 8;

export function weekIndexOf(date, now = DEMO_NOW) {
  const ageWeeks = Math.floor((now.getTime() - new Date(date).getTime()) / WEEK_MS);
  return TREND_WEEKS - ageWeeks;
}

/** Start of the given 1-based week index, counting back from `now`. */
export function weekStart(weekIndex, now = DEMO_NOW) {
  return new Date(now.getTime() - (TREND_WEEKS - weekIndex + 1) * WEEK_MS);
}

export function hoursSince(date, now = DEMO_NOW) {
  return (now.getTime() - new Date(date).getTime()) / HOUR_MS;
}

/** "2 jam lalu" / "kemarin" / "3 hari lalu" — the labels screen 05 shows. */
export function relativeLabel(date, now = DEMO_NOW) {
  const hours = hoursSince(date, now);
  if (hours < 1) return 'baru saja';
  if (hours < 24) return `${Math.floor(hours)} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'kemarin';
  if (days < 7) return `${days} hari lalu`;

  const weeks = Math.floor(days / 7);
  return weeks === 1 ? 'pekan lalu' : `${weeks} pekan lalu`;
}
