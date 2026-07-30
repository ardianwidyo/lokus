import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_LOCALE,
  LOCALES,
  createTranslator,
  localeDateTime,
  localeFactor,
  localeFullDate,
  localeInteger,
  localeMillionIdr,
  localeMonthYear,
  localeNumber,
  localePercent,
  localeShortDate,
  localeSigned,
  normaliseLocale,
} from '@lokus/core';

import { applyDocumentLocale, readLocale, writeLocale } from './localeStorage.js';
import { id } from './messages.id.js';
import { en } from './messages.en.js';

export const WEB_MESSAGES = Object.freeze({ id, en });

/** Built once at module scope: the dictionaries are constant, the locale is not. */
const translate = createTranslator(WEB_MESSAGES);

const LocaleContext = createContext(null);

/**
 * Holds the reader's language — US-8.
 *
 * Context rather than a store because this is exactly the case context is for: a
 * value read by nearly every component and written roughly never
 * (rules/react/patterns.md, "State Location Decision Tree"). One re-render of
 * the tree per language change is the whole cost.
 *
 * It sits *outside* `SessionProvider` in the tree on purpose. The language is the
 * person's, not the tenant's: selecting a different tenant clears every
 * tenant-scoped cache (constitution IV) and must not take the reader's language
 * with it.
 */
export function LocaleProvider({ initialLocale = null, children }) {
  const [locale, setLocaleState] = useState(() => normaliseLocale(initialLocale ?? readLocale()));

  // Not in an effect: the document attribute is not derived state, and setting it
  // on the first paint rather than after it avoids a frame where a screen reader
  // is told the wrong language.
  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next) => {
    const normalised = writeLocale(next);
    setLocaleState(normalised);
    return normalised;
  }, []);

  const value = useMemo(() => {
    const t = (key, params) => translate(locale, key, params);

    return {
      locale,
      locales: LOCALES,
      setLocale,
      t,

      /**
       * Formatters bound to the current locale, so a screen never has to
       * remember to pass it — a screen that forgot would silently render
       * Indonesian numbers inside English prose, which is exactly the drift
       * AC-8.3 is about.
       */
      fmt: {
        number: (value, digits) => localeNumber(locale, value, digits),
        factor: (value) => localeFactor(locale, value),
        integer: (value) => localeInteger(locale, value),
        signed: (value, digits) => localeSigned(locale, value, digits),
        percent: (share) => localePercent(locale, share),
        shortDate: (iso) => localeShortDate(locale, iso),
        fullDate: (iso) => localeFullDate(locale, iso),
        monthYear: (value) => localeMonthYear(locale, value),
        dateTime: (iso) => localeDateTime(locale, iso),
        millionIdr: (idr) => localeMillionIdr(locale, idr),
      },

      /**
       * A domain failure in the reader's language — AC-8.7.
       *
       * Keyed on `error.code`, which is stable, rather than on the message,
       * which is prose. A code with no entry falls back to the thrown message
       * (Indonesian) rather than to a blank panel or a bare code, so a new
       * domain error is readable the day it is added and translating it later is
       * a dictionary edit.
       */
      errorText: (error, fallbackKey = null) => {
        const code = error?.code;
        if (code && translate.has(locale, `error.${code}`)) {
          return translate(locale, `error.${code}`);
        }
        if (error?.message) return error.message;
        return fallbackKey ? translate(locale, fallbackKey) : null;
      },
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside a LocaleProvider');
  return value;
}

/** The common case: a component that only needs to read copy. */
export function useT() {
  return useLocale().t;
}

export { DEFAULT_LOCALE, translate };
