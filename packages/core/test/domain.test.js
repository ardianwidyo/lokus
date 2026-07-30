import { describe, expect, it } from 'vitest';

import {
  DEMO_NOW,
  TREND_WEEKS,
  hoursSince,
  relativeLabel,
  weekIndexOf,
  weekStart,
} from '../src/domain/clock.js';
import { OUTLETS, findOutlet, outletsForTenant, regionCount } from '../src/domain/outlets.js';
import { THEMES, THEME_IDS, findTheme, themeLabel } from '../src/domain/themes.js';

describe('clock', () => {
  it('pins the demo instant so every relative label is reproducible', () => {
    expect(DEMO_NOW.toISOString()).toBe('2026-07-28T01:00:00.000Z');
  });

  it('counts week 8 as the seven days ending now', () => {
    expect(weekIndexOf(DEMO_NOW)).toBe(TREND_WEEKS);
    expect(weekIndexOf(new Date(DEMO_NOW.getTime() - 6 * 24 * 3600_000))).toBe(TREND_WEEKS);
    expect(weekIndexOf(new Date(DEMO_NOW.getTime() - 8 * 24 * 3600_000))).toBe(TREND_WEEKS - 1);
  });

  it('places week starts a week apart, oldest first', () => {
    const first = weekStart(1);
    const last = weekStart(TREND_WEEKS);

    expect(last.getTime() - first.getTime()).toBe(7 * 7 * 24 * 3600_000);
  });

  it('measures age in hours', () => {
    expect(hoursSince(new Date(DEMO_NOW.getTime() - 2 * 3600_000))).toBe(2);
  });

  it.each([
    [0.5, 'baru saja'],
    [2, '2 jam lalu'],
    [26, 'kemarin'],
    [72, '3 hari lalu'],
    [8 * 24, 'pekan lalu'],
    [21 * 24, '3 pekan lalu'],
  ])('labels a review %p hours old as "%s"', (hours, expected) => {
    expect(relativeLabel(new Date(DEMO_NOW.getTime() - hours * 3600_000))).toBe(expected);
  });
});

describe('outlets', () => {
  it('holds the six outlets the demo covers', () => {
    expect(OUTLETS).toHaveLength(6);
    expect(OUTLETS.map((outlet) => outlet.outletId)).toContain('BKS-02');
  });

  it('finds an outlet and returns null for an unknown one', () => {
    expect(findOutlet('BKS-02').name).toBe('Bekasi Timur');
    expect(findOutlet('XXX-99')).toBeNull();
  });

  it('scopes outlets to a tenant', () => {
    expect(outletsForTenant('nusa-retail')).toHaveLength(6);
    expect(outletsForTenant('klinik-sehat-prima')).toHaveLength(0);
  });

  it('counts distinct regions, which is what the systemic rule needs (AC-2.2)', () => {
    expect(regionCount(['BKS-02', 'CKR-01', 'DPK-01', 'SRP-03'])).toBe(4);
    expect(regionCount(['BKS-02', 'BKS-02'])).toBe(1);
    expect(regionCount(['BKS-02', 'XXX-99'])).toBe(1);
  });

  it('gives every outlet a region, so no outlet is invisible to that rule', () => {
    expect(OUTLETS.every((outlet) => Boolean(outlet.region))).toBe(true);
  });
});

describe('themes', () => {
  it('defines the six complaint themes screen 07 charts', () => {
    expect(THEME_IDS).toEqual([
      'antrean-kasir',
      'kebersihan',
      'stok-kosong',
      'parkir',
      'harga-vs-pesaing',
      'keramahan-staf',
    ]);
  });

  it('gives every theme at least one weighted keyword', () => {
    for (const theme of THEMES) {
      expect(theme.keywords.length).toBeGreaterThan(0);
      expect(theme.keywords.every((k) => k.term && k.weight > 0)).toBe(true);
    }
  });

  it('looks a theme up by id and falls back to the id when unknown', () => {
    expect(findTheme('parkir').id).toBe('parkir');
    expect(findTheme('tidak-ada')).toBeNull();
    expect(themeLabel('parkir')).toBe('Parkir');
    expect(themeLabel('tidak-ada')).toBe('tidak-ada');
  });

  it('names a theme in the reader’s language, defaulting to Indonesian', () => {
    expect(themeLabel('antrean-kasir')).toBe('Antrean kasir');
    expect(themeLabel('antrean-kasir', 'id')).toBe('Antrean kasir');
    expect(themeLabel('antrean-kasir', 'en')).toBe('Checkout queues');
  });

  it('keeps the keyword table Indonesian in both locales', () => {
    // The keywords match customer review text, so they are not translatable —
    // an English keyword table would find nothing at all.
    expect(findTheme('antrean-kasir').keywords.map((k) => k.term)).toContain('antre');
    expect(THEMES.every((theme) => theme.label === undefined)).toBe(true);
  });
});
