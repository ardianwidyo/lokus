import { findOutlet } from '../domain/outlets.js';
import { themeLabel } from '../domain/themes.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { t } from '../i18n/index.js';

/**
 * AC-2.2: a theme present in 4 or more regions is systemic.
 *
 * The point of the rule is to tell an area manager whether to fix one branch or
 * change the network's SOP. It counts *regions*, not outlets, on purpose —
 * three complaints from three Bekasi stores is one local problem, three
 * complaints from Bekasi, Depok and Serpong is the start of a pattern.
 */
export const SYSTEMIC_REGION_THRESHOLD = 4;

/**
 * Marks each theme systemic or local. Takes the output of `themeCluster` and
 * returns it with `systemic`, `regionCount` and a short explanation attached.
 */
export function flagSystemicThemes(
  themes,
  { threshold = SYSTEMIC_REGION_THRESHOLD, locale = DEFAULT_LOCALE } = {},
) {
  return themes.map((theme) => {
    const regions = theme.regions ?? regionsOf(theme.outletIds ?? Object.keys(theme.byOutlet ?? {}));
    const regionCount = regions.length;
    const systemic = regionCount >= threshold;

    return {
      ...theme,
      regions,
      regionCount,
      systemic,
      // Rendered next to the flag so the reader can check the reasoning rather
      // than trust the badge.
      systemicReason: systemic
        ? t(locale, 'systemic.reasonSystemic', { count: regionCount, regions: regions.join(', ') })
        : t(locale, 'systemic.reasonLocal', {
            count: regionCount,
            regions: regions.join(', ') || t(locale, 'systemic.noRegion'),
            threshold,
          }),
    };
  });
}

/**
 * The one finding screen 07 leads with: the largest systemic theme, the branch
 * carrying most of it, and the branch that is somehow not affected.
 */
export function systemicFinding(themes, { locale = DEFAULT_LOCALE } = {}) {
  const flagged = flagSystemicThemes(themes, { locale });
  const systemic = flagged.filter((theme) => theme.systemic).sort((a, b) => b.count - a.count);

  if (systemic.length === 0) return null;

  const [top] = systemic;
  const byOutlet = Object.entries(top.byOutlet ?? {}).sort((a, b) => b[1] - a[1]);
  const worst = byOutlet[0];
  const best = byOutlet.at(-1);

  return {
    theme: top.theme,
    label: themeLabel(top.theme, locale),
    count: top.count,
    regionCount: top.regionCount,
    regions: top.regions,
    worstOutlet: worst ? { outletId: worst[0], name: findOutlet(worst[0])?.name ?? worst[0], count: worst[1] } : null,
    bestOutlet: best ? { outletId: best[0], name: findOutlet(best[0])?.name ?? best[0], count: best[1] } : null,
    headline: t(locale, 'systemic.headline', { theme: themeLabel(top.theme, locale) }),
    detail: t(locale, 'systemic.detail', {
      count: top.regionCount,
      total: countRegions(top),
    }),
  };
}

function countRegions(theme) {
  const outletIds = theme.outletIds ?? Object.keys(theme.byOutlet ?? {});
  return Math.max(theme.regionCount ?? 0, regionsOf(outletIds).length);
}

function regionsOf(outletIds) {
  return [...new Set(outletIds.map((id) => findOutlet(id)?.region).filter(Boolean))];
}
