import { findOutlet } from '../domain/outlets.js';
import { themeLabel } from '../domain/themes.js';

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
export function flagSystemicThemes(themes, { threshold = SYSTEMIC_REGION_THRESHOLD } = {}) {
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
        ? `Muncul di ${regionCount} wilayah: ${regions.join(', ')}.`
        : `Hanya di ${regionCount} wilayah (${regions.join(', ') || 'tidak ada'}); ambang sistemik ${threshold}.`,
    };
  });
}

/**
 * The one finding screen 07 leads with: the largest systemic theme, the branch
 * carrying most of it, and the branch that is somehow not affected.
 */
export function systemicFinding(themes) {
  const flagged = flagSystemicThemes(themes);
  const systemic = flagged.filter((theme) => theme.systemic).sort((a, b) => b.count - a.count);

  if (systemic.length === 0) return null;

  const [top] = systemic;
  const byOutlet = Object.entries(top.byOutlet ?? {}).sort((a, b) => b[1] - a[1]);
  const worst = byOutlet[0];
  const best = byOutlet.at(-1);

  return {
    theme: top.theme,
    label: themeLabel(top.theme),
    count: top.count,
    regionCount: top.regionCount,
    regions: top.regions,
    worstOutlet: worst ? { outletId: worst[0], name: findOutlet(worst[0])?.name ?? worst[0], count: worst[1] } : null,
    bestOutlet: best ? { outletId: best[0], name: findOutlet(best[0])?.name ?? best[0], count: best[1] } : null,
    headline: `${themeLabel(top.theme)} adalah masalah sistemik, bukan lokal`,
    detail:
      `Muncul di ${top.regionCount} dari ${countRegions(top)} wilayah yang dipantau. ` +
      'Perbaikan per cabang tidak akan cukup — usulan agen: ubah aturan terkait di SOP pusat.',
  };
}

function countRegions(theme) {
  const outletIds = theme.outletIds ?? Object.keys(theme.byOutlet ?? {});
  return Math.max(theme.regionCount ?? 0, regionsOf(outletIds).length);
}

function regionsOf(outletIds) {
  return [...new Set(outletIds.map((id) => findOutlet(id)?.region).filter(Boolean))];
}
