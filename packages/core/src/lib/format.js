/**
 * Indonesian number formatting for anything a person reads.
 *
 * Indonesian writes 3,04 where JavaScript writes 3.04. Every screen already
 * formats its own figures with a comma, but the prose the agents compose was
 * interpolating raw numbers — so the flagship chat answer read "Rating
 * berjalan 3.04" beside a header reading "3,60". Same console, two
 * conventions, and the agent's own sentence was the one that looked foreign.
 *
 * These helpers exist so the rule has one home rather than a `.replace()` at
 * each call site, which is how it drifted in the first place.
 *
 * Since US-8 there are two conventions to serve, not one, and the real
 * implementation lives in `i18n/format.js` where the locale is a parameter.
 * These three stay as the Indonesian-bound names, because a caller that is
 * *specifically* about Indonesian — the seeded dataset, an Indonesian-only test
 * assertion — should not have to pass a locale to say so.
 */

import { LOCALE } from '../i18n/locales.js';
import { localeFactor, localeInteger, localeNumber } from '../i18n/format.js';

/** `3.04` → `"3,04"`. Returns `null` unchanged so callers can guard on it. */
export function idNumber(value, digits = 2) {
  return localeNumber(LOCALE.ID, value, digits);
}

/**
 * Like `idNumber`, but drops a trailing `,0` — a multiplier reads better as
 * "naik 3,67×" and "naik 2×" than as "naik 2,00×".
 */
export function idFactor(value) {
  return localeFactor(LOCALE.ID, value);
}

/** `1840000` → `"1.840.000"`, the thousands separator Indonesian uses. */
export function idInteger(value) {
  return localeInteger(LOCALE.ID, value);
}
