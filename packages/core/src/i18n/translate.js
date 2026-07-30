/**
 * One translator, shared by the two dictionary pairs — `packages/core/src/i18n`
 * for agent-authored copy and `web/src/i18n` for console chrome.
 *
 * It is deliberately small. A message is a template with `{name}` holes, and
 * nothing else: no pluralisation rules, no gender, no nested selectors. Both
 * languages here pluralise nouns the same way for the counts LOKUS shows
 * ("3 review" / "3 reviews" is handled by writing the English message with the
 * plural, because every count that reaches these strings is a total that reads
 * naturally in the plural). Inventing an ICU subset nobody needs would be a
 * dependency with extra steps.
 *
 * A missing key falls back to the default locale rather than rendering the key,
 * so a gap in the English dictionary degrades to Indonesian prose instead of to
 * `briefing.timeline.handover` in the middle of a paragraph. The parity test is
 * what actually catches the gap (AC-8.6); this is only what happens if it slips
 * through to a reader.
 */

import { DEFAULT_LOCALE, normaliseLocale } from './locales.js';

/** `{name}` → the value, leaving an unmatched hole visibly intact. */
export function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  );
}

/**
 * Flattens `{ a: { b: 'x' } }` to `{ 'a.b': 'x' }`.
 *
 * Dictionaries are written nested, because that is how the copy groups on
 * screen, and read flat, because a dotted key in a component is easier to grep
 * for than a chain of property accesses.
 */
export function flatten(source, prefix = '') {
  const flat = {};

  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flat, flatten(value, path));
      continue;
    }

    flat[path] = value;
  }

  return flat;
}

/**
 * `createTranslator({ id, en })` → `t(locale, key, params)`.
 *
 * Dictionaries are flattened once at construction, so a lookup is one map read
 * rather than a walk down the object on every render.
 */
export function createTranslator(dictionaries) {
  const flat = Object.fromEntries(
    Object.entries(dictionaries).map(([locale, messages]) => [locale, flatten(messages)]),
  );

  const fallback = flat[DEFAULT_LOCALE] ?? {};

  function t(locale, key, params = undefined) {
    const table = flat[normaliseLocale(locale)] ?? fallback;
    const template = table[key] ?? fallback[key];

    // Not a silent empty string: a key that exists in neither dictionary is a
    // bug, and rendering it is how it gets noticed in a screenshot.
    if (template === undefined) return key;

    return params ? interpolate(template, params) : template;
  }

  /** The key sets, for the parity test and for nothing else. */
  t.keysOf = (locale) => Object.keys(flat[normaliseLocale(locale)] ?? {});
  t.has = (locale, key) => Object.prototype.hasOwnProperty.call(flat[normaliseLocale(locale)] ?? {}, key);

  /** Binds the locale, for a caller that has one and threads it everywhere. */
  t.for = (locale) => (key, params) => t(locale, key, params);

  return t;
}

/**
 * The parity check both layers run in their own test (AC-8.6).
 *
 * Returns the keys each dictionary is missing rather than a boolean, because
 * "the dictionaries disagree" is not an actionable failure message and a list of
 * three key names is.
 */
export function dictionaryParity(dictionaries) {
  const flat = Object.fromEntries(
    Object.entries(dictionaries).map(([locale, messages]) => [locale, new Set(Object.keys(flatten(messages)))]),
  );

  const every = new Set(Object.values(flat).flatMap((keys) => [...keys]));

  return Object.fromEntries(
    Object.entries(flat).map(([locale, keys]) => [
      locale,
      [...every].filter((key) => !keys.has(key)).sort(),
    ]),
  );
}
