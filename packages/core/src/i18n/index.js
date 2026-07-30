/**
 * The domain's translator. One instance, built once, shared by every function in
 * `packages/core` that writes a sentence a reader sees.
 *
 * It is a module-level singleton because the *dictionaries* are constant. The
 * locale is not: it arrives as a parameter on every call, so one API process
 * serves both languages concurrently without any request-scoped state
 * (plan.md, "Localisation").
 */

import { createTranslator } from './translate.js';
import { id } from './messages.id.js';
import { en } from './messages.en.js';

export const CORE_MESSAGES = Object.freeze({ id, en });

export const t = createTranslator(CORE_MESSAGES);

export {
  DEFAULT_LOCALE,
  LOCALE,
  LOCALES,
  isLocale,
  localeFromAcceptLanguage,
  normaliseLocale,
} from './locales.js';

export { createTranslator, dictionaryParity, flatten, interpolate } from './translate.js';

export {
  INTL_TAG,
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
} from './format.js';
