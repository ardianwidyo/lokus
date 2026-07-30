export const THEMES = Object.freeze(['light', 'dark']);
export const DEFAULT_THEME = 'light';

export function isTheme(value) {
  return THEMES.includes(value);
}

function normaliseTheme(value) {
  return isTheme(value) ? value : DEFAULT_THEME;
}

/**
 * Where the reader's theme choice is kept, mirroring `i18n/localeStorage.js`.
 *
 * `localStorage`, not a cookie, for the same reason as the locale: a display
 * preference with no bearing on authorisation never needs to reach the API,
 * and the API never reads it either.
 *
 * Not tenant-scoped, for the same reason as the locale: the theme belongs to
 * the person reading, not to the tenant they happen to be looking at.
 */
const KEY = 'lokus.theme';

export function readTheme(storage = safeStorage()) {
  try {
    const stored = storage?.getItem(KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Falls through to the system preference below.
  }
  return systemTheme();
}

export function writeTheme(theme, storage = safeStorage()) {
  const normalised = normaliseTheme(theme);
  try {
    storage?.setItem(KEY, normalised);
  } catch {
    // Private browsing, a full quota, or storage disabled. The choice still
    // applies to this session; it simply will not outlive a reload.
  }
  return normalised;
}

/**
 * Reflects the theme onto the document as `data-theme`, which is what
 * `design/tokens.css` keys its dark overrides off. Every token is a CSS
 * custom property, so this one attribute is the entire mechanism — no
 * component re-renders because the palette changed.
 */
export function applyDocumentTheme(theme, doc = globalThis.document) {
  if (doc?.documentElement) doc.documentElement.dataset.theme = normaliseTheme(theme);
}

/** A first-visit default only — an explicit choice in storage always wins. */
function systemTheme() {
  try {
    if (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // matchMedia unavailable (SSR, older environments) — fall back below.
  }
  return DEFAULT_THEME;
}

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export { KEY as THEME_STORAGE_KEY };
