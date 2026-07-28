import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { themeCluster } from '../src/analytics/themeCluster.js';
import {
  SYSTEMIC_REGION_THRESHOLD,
  flagSystemicThemes,
  systemicFinding,
} from '../src/analytics/systemic.js';

const TENANT = 'nusa-retail';

const clustered = async () => {
  const { data } = await createSeededGbpAdapter().listReviews({ tenantId: TENANT, limit: 5000 });
  const result = await themeCluster({ tenantId: TENANT, reviews: data.reviews });
  return result.data.themes;
};

const themeWithOutlets = (outletIds, count = 10) => ({
  theme: 'antrean-kasir',
  count,
  byOutlet: Object.fromEntries(outletIds.map((id) => [id, 1])),
  outletIds,
});

describe('systemic flag (AC-2.2)', () => {
  it('uses a threshold of four regions', () => {
    expect(SYSTEMIC_REGION_THRESHOLD).toBe(4);
  });

  it('flags a theme carried by four regions', () => {
    const [theme] = flagSystemicThemes([
      themeWithOutlets(['BKS-02', 'DPK-01', 'SRP-03', 'BGR-01']),
    ]);

    expect(theme.systemic).toBe(true);
    expect(theme.regionCount).toBe(4);
  });

  it('does not flag a theme carried by three regions', () => {
    const [theme] = flagSystemicThemes([themeWithOutlets(['BKS-02', 'DPK-01', 'SRP-03'])]);

    expect(theme.systemic).toBe(false);
    expect(theme.regionCount).toBe(3);
  });

  it('counts regions, not outlets — several branches in one city stay local', () => {
    // Four outlets, but the region list behind them is what decides.
    const [theme] = flagSystemicThemes([
      { theme: 'parkir', count: 9, byOutlet: { 'BKS-02': 9 }, outletIds: ['BKS-02'] },
    ]);

    expect(theme.systemic).toBe(false);
    expect(theme.regionCount).toBe(1);
  });

  it('explains its own verdict instead of just showing a badge', () => {
    const [systemic] = flagSystemicThemes([
      themeWithOutlets(['BKS-02', 'DPK-01', 'SRP-03', 'BGR-01']),
    ]);
    const [local] = flagSystemicThemes([themeWithOutlets(['BKS-02'])]);

    expect(systemic.systemicReason).toMatch(/Muncul di 4 wilayah/);
    expect(local.systemicReason).toMatch(/ambang sistemik 4/);
  });

  it('ignores outlet ids it does not know rather than counting them as a region', () => {
    const [theme] = flagSystemicThemes([
      themeWithOutlets(['BKS-02', 'XXX-99', 'YYY-88', 'ZZZ-77']),
    ]);

    expect(theme.regionCount).toBe(1);
    expect(theme.systemic).toBe(false);
  });
});

describe('systemicFinding on the seeded network', () => {
  it('leads with checkout queues, which span five regions', async () => {
    const finding = systemicFinding(await clustered());

    expect(finding.theme).toBe('antrean-kasir');
    expect(finding.regionCount).toBeGreaterThanOrEqual(4);
    expect(finding.headline).toBe('Antrean kasir adalah masalah sistemik, bukan lokal');
  });

  it('names the worst branch and the one that is coping', async () => {
    const finding = systemicFinding(await clustered());

    expect(finding.worstOutlet.outletId).toBe('BKS-02');
    expect(finding.worstOutlet.name).toBe('Bekasi Timur');
    expect(finding.bestOutlet.count).toBeLessThan(finding.worstOutlet.count);
  });

  it('returns nothing when no theme reaches the threshold', () => {
    expect(systemicFinding([themeWithOutlets(['BKS-02', 'DPK-01'])])).toBeNull();
    expect(systemicFinding([])).toBeNull();
  });
});
