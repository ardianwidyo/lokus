import { useLocale } from './LocaleContext.jsx';

/**
 * The language control — AC-8.1.
 *
 * Two radio inputs in a `radiogroup`, styled like the segmented controls the
 * inbox and the board already use. Not a `<select>`: two options do not need
 * hiding behind a click, and not two buttons either, because "one of these is
 * currently chosen" is what a radio group means and it is what a screen reader
 * should be told.
 *
 * design/SCREENS.md places it in the rail footer, and in the content header
 * below 900px where the rail is gone. Both instances render this component, so
 * there is one control with two mounts rather than two controls to keep in step.
 */
export function LanguageSwitcher({ className = '' }) {
  const { locale, locales, setLocale, t } = useLocale();

  return (
    <div
      className={`seg lang-switch ${className}`.trim()}
      role="radiogroup"
      aria-label={t('shell.languageLabel')}
    >
      {locales.map((option) => (
        <label key={option} className="seg-opt lang-opt">
          <input
            type="radio"
            name="lokus-locale"
            value={option}
            checked={locale === option}
            onChange={() => setLocale(option)}
          />
          <span aria-hidden="true">{t(`shell.language${option === 'id' ? 'Id' : 'En'}`)}</span>
          {/* The two-letter code is the affordance; the full name is what gets
              read out, because "ID" and "EN" are not words. */}
          <span className="sr-only">
            {t(`shell.language${option === 'id' ? 'Id' : 'En'}Full`)}
          </span>
        </label>
      ))}
    </div>
  );
}
