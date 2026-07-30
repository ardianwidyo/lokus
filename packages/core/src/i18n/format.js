/**
 * Number and date formatting that follows the reader's locale — AC-8.3.
 *
 * The rule these replace was one-directional: `lib/format.js` turned `3.04` into
 * `"3,04"` because Indonesian writes it that way. With two locales the same
 * figure has to read `3.04` in English, so the swap cannot be a `.replace()`
 * hardcoded at the call site any more.
 *
 * `Intl` does the work. It ships with Node and every browser LOKUS targets, and
 * it is the one place where "what separator does this language use" is already
 * answered correctly for both.
 */

import { DEFAULT_LOCALE, normaliseLocale } from './locales.js';

/** The BCP 47 tags to hand `Intl`; the bare `id` and `en` are too vague for dates. */
const INTL_TAG = Object.freeze({ id: 'id-ID', en: 'en-GB' });

function tagFor(locale) {
  return INTL_TAG[normaliseLocale(locale)] ?? INTL_TAG[DEFAULT_LOCALE];
}

function isBlank(value) {
  return value === null || value === undefined || Number.isNaN(value);
}

/** `3.04` → `"3,04"` in Indonesian, `"3.04"` in English. `null` passes through. */
export function localeNumber(locale, value, digits = 2) {
  if (isBlank(value)) return null;

  return new Intl.NumberFormat(tagFor(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(value);
}

/**
 * Like `localeNumber` but keeps only the digits the value actually has, so a
 * multiplier reads "3,67×" and "2×" rather than "2,00×".
 */
export function localeFactor(locale, value) {
  if (isBlank(value)) return null;

  return new Intl.NumberFormat(tagFor(locale), { maximumFractionDigits: 2 }).format(value);
}

/** `1840000` → `"1.840.000"` in Indonesian, `"1,840,000"` in English. */
export function localeInteger(locale, value) {
  if (isBlank(value)) return null;

  return new Intl.NumberFormat(tagFor(locale), { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

/** A signed delta, with the minus sign the locale uses. */
export function localeSigned(locale, value, digits = 2) {
  if (isBlank(value)) return null;

  return new Intl.NumberFormat(tagFor(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: 'exceptZero',
    useGrouping: false,
  }).format(value);
}

/**
 * A whole percentage as a reader sees it. Takes the share (`0.62`), not the
 * number of percent, because that is what the analytics return.
 */
export function localePercent(locale, share) {
  if (isBlank(share)) return null;

  return new Intl.NumberFormat(tagFor(locale), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(share);
}

/** `"30 Jul"` / `"30 Jul"` — the short form a ticket due date uses. */
export function localeShortDate(locale, iso) {
  if (!iso) return null;

  return new Intl.DateTimeFormat(tagFor(locale), { day: 'numeric', month: 'short' }).format(
    new Date(iso),
  );
}

/** `"Kamis, 30 Juli 2026"` / `"Thursday, 30 July 2026"` — the briefing header. */
export function localeFullDate(locale, iso) {
  if (!iso) return null;

  return new Intl.DateTimeFormat(tagFor(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/** `"Juli 2026"` / `"July 2026"` — when a branch opened. */
export function localeMonthYear(locale, value) {
  if (!value) return null;

  // Accepts the bare `YYYY-MM` the outlet records carry as well as a full ISO
  // timestamp; `new Date('2019-04')` is valid but midnight UTC, which can slip
  // to the previous month in a negative offset. Building it from the parts
  // avoids that.
  const [year, month] = String(value).split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat(tagFor(locale), { month: 'long', year: 'numeric' }).format(date);
}

/** `"30 Jul 06.02"` / `"30 Jul 06:02"` — the eval report timestamp. */
export function localeDateTime(locale, iso) {
  if (!iso) return null;

  return new Intl.DateTimeFormat(tagFor(locale), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * Rupiah in millions, the unit screen 14 reads in. The currency stays IDR in
 * both locales — the tenant is billed in rupiah whatever language the operator
 * reads, and converting it would be inventing an exchange rate.
 */
export function localeMillionIdr(locale, idr) {
  if (isBlank(idr)) return null;

  return `Rp ${localeNumber(locale, idr / 1_000_000, 2)} ${
    normaliseLocale(locale) === 'en' ? 'M' : 'jt'
  }`;
}

export { INTL_TAG };
