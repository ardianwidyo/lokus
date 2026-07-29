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
 */

/** `3.04` → `"3,04"`. Returns `null` unchanged so callers can guard on it. */
export function idNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value.toFixed(digits).replace('.', ',');
}

/**
 * Like `idNumber`, but drops a trailing `,0` — a multiplier reads better as
 * "naik 3,67×" and "naik 2×" than as "naik 2,00×".
 */
export function idFactor(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return String(value).replace('.', ',');
}

/** `1840000` → `"1.840.000"`, the thousands separator Indonesian uses. */
export function idInteger(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
