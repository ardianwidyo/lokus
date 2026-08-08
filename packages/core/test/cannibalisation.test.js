import { describe, expect, it } from 'vitest';

import { findOutlet } from '../src/domain/outlets.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import { CANNIBALISATION_THRESHOLD_KM, cannibalisation } from '../src/location/cannibalisation.js';

const TENANT = 'nusa-retail';

describe('bq.cannibalisation (AC-5.2)', () => {
  it('uses a threshold of 1.2 km', () => {
    expect(CANNIBALISATION_THRESHOLD_KM).toBe(1.2);
  });

  it('flags a candidate closer than the threshold to an own outlet', async () => {
    // 500 m from Bekasi Timur.
    const bekasi = findOutlet('BKS-02').geo;
    const { data } = await cannibalisation({
      tenantId: TENANT,
      geo: { lat: bekasi.lat + 0.0045, lng: bekasi.lng },
    });

    expect(data.flagged).toBe(true);
    expect(data.nearestOwn.outletId).toBe('BKS-02');
    expect(data.verdict).toMatch(/cuma pindah, bukan pelanggan baru/);
  });

  it('does not flag a candidate comfortably clear of every branch', async () => {
    const { data } = await cannibalisation({ tenantId: TENANT, geo: { lat: -6.36, lng: 106.9 } });

    expect(data.flagged).toBe(false);
    expect(data.verdict).toMatch(/tidak rebutan pelanggan/);
  });

  it('is exclusive at the boundary, so exactly 1.2 km is not flagged', async () => {
    const bekasi = findOutlet('BKS-02').geo;
    // ~1.2 km due north.
    const { data } = await cannibalisation({
      tenantId: TENANT,
      geo: { lat: bekasi.lat + 0.01078, lng: bekasi.lng },
    });

    expect(data.nearestOwnKm).toBeGreaterThanOrEqual(1.2);
    expect(data.flagged).toBe(false);
  });

  it('can exclude the outlet being relocated from its own comparison', async () => {
    const bekasi = findOutlet('BKS-02').geo;

    const included = await cannibalisation({ tenantId: TENANT, geo: bekasi });
    const excluded = await cannibalisation({
      tenantId: TENANT,
      geo: bekasi,
      excludeOutletId: 'BKS-02',
    });

    expect(included.data.nearestOwnKm).toBe(0);
    expect(excluded.data.nearestOwn.outletId).not.toBe('BKS-02');
  });

  it('points at the branch it would cannibalise', async () => {
    const bekasi = findOutlet('BKS-02').geo;
    const result = await cannibalisation({ tenantId: TENANT, geo: bekasi });

    expect(result.sources[0]).toMatchObject({ type: 'outlet', outletId: 'BKS-02' });
  });

  it('sees no own outlets for a tenant that has none', async () => {
    const { data } = await cannibalisation({
      tenantId: 'klinik-sehat-prima',
      geo: { lat: -6.2, lng: 106.8 },
    });

    expect(data.nearestOwn).toBeNull();
    expect(data.flagged).toBe(false);
  });

  it('refuses without a coordinate or a tenant', async () => {
    await expect(cannibalisation({ tenantId: TENANT })).rejects.toMatchObject({ code: 'GEO_REQUIRED' });
    await expect(cannibalisation({ geo: { lat: 1, lng: 1 } })).rejects.toBeInstanceOf(TenantScopeError);
  });
});
