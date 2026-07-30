import { describe, expect, it } from 'vitest';

import {
  CORE_MESSAGES,
  DEFAULT_LOCALE,
  LOCALES,
  createTranslator,
  dictionaryParity,
  flatten,
  interpolate,
  isLocale,
  localeFactor,
  localeFromAcceptLanguage,
  localeFullDate,
  localeInteger,
  localeMillionIdr,
  localeMonthYear,
  localeNumber,
  localePercent,
  localeShortDate,
  localeSigned,
  normaliseLocale,
  t,
} from '../src/i18n/index.js';
import { idFactor, idInteger, idNumber } from '../src/lib/format.js';

describe('T062 · locales', () => {
  it('offers exactly Indonesian and English, defaulting to Indonesian (AC-8.1)', () => {
    expect(LOCALES).toEqual(['id', 'en']);
    expect(DEFAULT_LOCALE).toBe('id');
  });

  it('normalises regional and cased tags to the locale they belong to', () => {
    expect(normaliseLocale('en-GB')).toBe('en');
    expect(normaliseLocale('EN')).toBe('en');
    expect(normaliseLocale('id_ID')).toBe('id');
    expect(normaliseLocale(' en ')).toBe('en');
  });

  it('falls back to Indonesian rather than failing on an unknown tag', () => {
    // A wrong Accept-Language must not stop somebody reading their branches.
    for (const value of ['fr', 'zz-ZZ', '', null, undefined, 42]) {
      expect(normaliseLocale(value)).toBe('id');
    }
    expect(isLocale('fr')).toBe(false);
  });

  it('honours q weights in Accept-Language, not header order', () => {
    expect(localeFromAcceptLanguage('id;q=0.8, en;q=0.9')).toBe('en');
    expect(localeFromAcceptLanguage('en;q=0.2, id;q=0.7')).toBe('id');
  });

  it('skips languages it does not have instead of taking the first tag', () => {
    expect(localeFromAcceptLanguage('fr-FR, de, en-GB')).toBe('en');
    expect(localeFromAcceptLanguage('fr-FR, de')).toBe('id');
    expect(localeFromAcceptLanguage(undefined)).toBe('id');
  });
});

describe('T062 · the translator', () => {
  it('fills {named} holes and leaves an unmatched one visible', () => {
    expect(interpolate('{count} review di {outlet}', { count: 3, outlet: 'Bekasi' })).toBe(
      '3 review di Bekasi',
    );
    // Visible rather than silently blank: a missing param is a bug, and an empty
    // string in the middle of a sentence hides it.
    expect(interpolate('{a} and {b}', { a: 'x' })).toBe('x and {b}');
  });

  it('reads a nested dictionary through a dotted key', () => {
    expect(flatten({ a: { b: { c: 'x' } }, d: 'y' })).toEqual({ 'a.b.c': 'x', d: 'y' });
  });

  it('falls back to Indonesian for a key the other dictionary lacks', () => {
    const partial = createTranslator({
      id: { greet: 'Halo', only: 'Cuma Indonesia' },
      en: { greet: 'Hello' },
    });

    expect(partial('en', 'greet')).toBe('Hello');
    // Degrades to Indonesian prose, not to the raw key mid-sentence.
    expect(partial('en', 'only')).toBe('Cuma Indonesia');
  });

  it('renders the key itself when neither dictionary has it', () => {
    const partial = createTranslator({ id: {}, en: {} });
    expect(partial('id', 'nothing.here')).toBe('nothing.here');
  });

  it('binds a locale for a caller that threads one everywhere', () => {
    const indonesian = t.for('id');
    const english = t.for('en');

    expect(indonesian('theme.parkir')).toBe('Parkir');
    expect(english('theme.parkir')).toBe('Parking');
  });

  it('has no key in one dictionary that the other lacks (AC-8.6)', () => {
    const missing = dictionaryParity(CORE_MESSAGES);

    // Named rather than counted: "the dictionaries disagree" is not actionable,
    // a list of three key names is.
    expect(missing).toEqual({ id: [], en: [] });
  });

  it('leaves no message an empty string in either language', () => {
    for (const locale of LOCALES) {
      const blank = t.keysOf(locale).filter((key) => String(t(locale, key)).trim() === '');
      expect(blank).toEqual([]);
    }
  });
});

describe('T062 · locale-aware formatting (AC-8.3)', () => {
  it('writes a decimal the way each language does', () => {
    expect(localeNumber('id', 3.04)).toBe('3,04');
    expect(localeNumber('en', 3.04)).toBe('3.04');
  });

  it('groups thousands the way each language does', () => {
    expect(localeInteger('id', 1_840_000)).toBe('1.840.000');
    expect(localeInteger('en', 1_840_000)).toBe('1,840,000');
  });

  it('drops the digits a multiplier does not have', () => {
    expect(localeFactor('id', 3.67)).toBe('3,67');
    expect(localeFactor('en', 3.67)).toBe('3.67');
    expect(localeFactor('id', 2)).toBe('2');
  });

  it('passes null through so a caller can guard on it', () => {
    for (const fn of [localeNumber, localeFactor, localeInteger, localeSigned, localePercent]) {
      expect(fn('id', null)).toBeNull();
      expect(fn('en', undefined)).toBeNull();
    }
    expect(localeShortDate('id', null)).toBeNull();
    expect(localeMonthYear('en', null)).toBeNull();
  });

  it('shows the sign on a delta even when it is positive', () => {
    expect(localeSigned('id', 0.24)).toBe('+0,24');
    expect(localeSigned('en', -0.24)).toMatch(/^.0\.24$/);
  });

  it('turns a share into whole percent', () => {
    expect(localePercent('id', 0.62)).toBe('62%');
    expect(localePercent('en', 0.62)).toBe('62%');
  });

  it('names months and weekdays in the reader’s language', () => {
    expect(localeFullDate('id', '2026-07-30T00:00:00.000Z')).toContain('Juli');
    expect(localeFullDate('en', '2026-07-30T00:00:00.000Z')).toContain('July');
  });

  it('reads a bare YYYY-MM without slipping to the previous month', () => {
    // `new Date('2019-04')` is midnight UTC, which is March in a negative offset.
    expect(localeMonthYear('id', '2019-04')).toBe('April 2019');
    expect(localeMonthYear('en', '2019-04')).toBe('April 2019');
  });

  it('keeps money in rupiah in both languages, changing only the unit word', () => {
    // Converting would need an exchange rate LOKUS does not have, which would
    // turn a real figure into an invented one.
    expect(localeMillionIdr('id', 1_840_000)).toBe('Rp 1,84 jt');
    expect(localeMillionIdr('en', 1_840_000)).toBe('Rp 1.84 M');
  });

  it('keeps the Indonesian-bound helpers agreeing with the locale-aware ones', () => {
    expect(idNumber(3.04)).toBe(localeNumber('id', 3.04));
    expect(idFactor(3.67)).toBe(localeFactor('id', 3.67));
    expect(idInteger(1_840_000)).toBe(localeInteger('id', 1_840_000));
  });
});
