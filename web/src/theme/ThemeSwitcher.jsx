import { useT } from '../i18n/index.js';
import { useTheme } from './ThemeContext.jsx';

/**
 * The light/dark control — same shape as `LanguageSwitcher`, for the same
 * reasons: two radio inputs in a `radiogroup` rather than a `<select>` or a
 * single toggle button, because "one of these two is currently chosen" is
 * exactly what a radio group means.
 *
 * Mounted twice, like the language switch: the rail footer, and the content
 * header below 900px where the rail is gone. `.theme-opt`/`.theme-switch`
 * share their rules with `.lang-opt`/`.lang-switch` in shell.css rather than
 * duplicating them.
 */
export function ThemeSwitcher({ className = '' }) {
  const { theme, themes, setTheme } = useTheme();
  const t = useT();

  return (
    <div
      className={`seg theme-switch ${className}`.trim()}
      role="radiogroup"
      aria-label={t('shell.themeLabel')}
    >
      {themes.map((option) => (
        <label key={option} className="seg-opt theme-opt">
          <input
            type="radio"
            name="lokus-theme"
            value={option}
            checked={theme === option}
            onChange={() => setTheme(option)}
          />
          <span aria-hidden="true">{t(`shell.theme${option === 'dark' ? 'Dark' : 'Light'}`)}</span>
          <span className="sr-only">
            {t(`shell.theme${option === 'dark' ? 'Dark' : 'Light'}Full`)}
          </span>
        </label>
      ))}
    </div>
  );
}
