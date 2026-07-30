/**
 * The two locales the console speaks — US-8.
 *
 * Indonesian is the default and the canonical copy: it is written first, in
 * `design/SCREENS.md`, and English is written against it. A reader who has never
 * chosen gets Indonesian, and so does a request that arrives with a header
 * naming a language LOKUS does not have.
 *
 * There is no `LOCALES.push` and no runtime registration. Adding a third locale
 * is a change to this file and two dictionaries, which is the point: the parity
 * test can only check dictionaries it knows the names of.
 */

export const LOCALE = Object.freeze({ ID: 'id', EN: 'en' });

export const LOCALES = Object.freeze([LOCALE.ID, LOCALE.EN]);

export const DEFAULT_LOCALE = LOCALE.ID;

export function isLocale(value) {
  return LOCALES.includes(value);
}

/**
 * Anything to a supported locale, never an error.
 *
 * Accepts the bare tag and the regional form, so `en-GB`, `EN`, and `id-ID` all
 * land where they should. An unrecognised value is Indonesian rather than a
 * rejected request: a wrong `Accept-Language` should not stop somebody reading
 * their branches.
 */
export function normaliseLocale(value) {
  const tag = String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];

  return isLocale(tag) ? tag : DEFAULT_LOCALE;
}

/**
 * The first supported locale in an `Accept-Language` header, honouring `q`
 * weights. `en;q=0.9, id;q=0.8` is English even though Indonesian appears too,
 * and `fr, en` is English because French is not on offer.
 */
export function localeFromAcceptLanguage(header) {
  const entries = String(header ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.split(';').map((piece) => piece.trim());
      const q = params
        .map((param) => /^q=([\d.]+)$/i.exec(param))
        .find(Boolean);

      return { tag, quality: q ? Number(q[1]) : 1 };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.quality))
    // Stable within equal weights, so the header's own order decides ties.
    .sort((a, b) => b.quality - a.quality);

  const match = entries.find((entry) => isLocale(entry.tag.toLowerCase().split(/[-_]/)[0]));

  return match ? normaliseLocale(match.tag) : DEFAULT_LOCALE;
}
