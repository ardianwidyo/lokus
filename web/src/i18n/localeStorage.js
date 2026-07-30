import { DEFAULT_LOCALE, isLocale, normaliseLocale } from '@lokus/core';

/**
 * Where the reader's language choice is kept — AC-8.2.
 *
 * `localStorage` and not a cookie: the choice is a display preference with no
 * bearing on authorisation, so it does not need to travel to the server on every
 * request, and a value the API never reads cannot be used to influence what the
 * API returns for somebody else.
 *
 * Deliberately *not* tenant-scoped, unlike everything in `tenantCache.js`. The
 * language belongs to the person, not to the tenant they happen to be looking
 * at: switching from Nusa Retail to Klinik Sehat Prima should not switch the
 * console back into a language the reader did not ask for. Constitution IV is
 * about tenant data, and a UI language is not tenant data.
 */
const KEY = 'lokus.locale';

export function readLocale(storage = safeStorage()) {
  try {
    const stored = storage?.getItem(KEY);
    // Only a locale LOKUS actually has. A stale or hand-edited value falls back
    // rather than rendering every key as its own name.
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeLocale(locale, storage = safeStorage()) {
  const normalised = normaliseLocale(locale);
  try {
    storage?.setItem(KEY, normalised);
  } catch {
    // Private browsing, a full quota, or storage disabled. The choice still
    // applies to this session; it simply will not outlive a reload, which is
    // better than the switch appearing to do nothing.
  }
  return normalised;
}

/**
 * Reflects the locale onto the document — AC-8.2.
 *
 * `<html lang>` is not decoration: it tells a screen reader which voice to use
 * and the browser which hyphenation and quotation rules apply. A page of English
 * served as `lang="id"` is read aloud in the wrong accent.
 */
export function applyDocumentLocale(locale, doc = globalThis.document) {
  if (doc?.documentElement) doc.documentElement.lang = normaliseLocale(locale);
}

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export { KEY as LOCALE_STORAGE_KEY };
