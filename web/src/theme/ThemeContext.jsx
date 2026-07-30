import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { THEMES, applyDocumentTheme, readTheme, writeTheme } from './themeStorage.js';

const ThemeContext = createContext(null);

/**
 * Holds the reader's light/dark preference — same shape as `LocaleContext`,
 * for the same reason: a value read by nearly every screen (through
 * `design/tokens.css`) and written roughly never.
 *
 * It sits outside `SessionProvider`, like `LocaleProvider`: the theme is the
 * reader's, not the tenant's, so switching tenants must not touch it.
 */
export function ThemeProvider({ initialTheme = null, children }) {
  const [theme, setThemeState] = useState(() => initialTheme ?? readTheme());

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    const normalised = writeTheme(next);
    setThemeState(normalised);
    return normalised;
  }, []);

  const value = useMemo(() => ({ theme, themes: THEMES, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside a ThemeProvider');
  return value;
}
