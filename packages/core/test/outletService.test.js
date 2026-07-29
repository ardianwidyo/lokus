import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { createSeededPlacesAdapter } from '../src/adapters/places.js';
import { TREND_WEEKS } from '../src/domain/clock.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import { BLOCK_WEEKS, createOutletService } from '../src/services/outletService.js';

const TENANT = 'nusa-retail';

const service = () =>
  createOutletService({ gbp: createSeededGbpAdapter(), places: createSeededPlacesAdapter() });

describe('outletService.detail (T034)', () => {
  it('refuses to read a branch without a tenant', async () => {
    await expect(service().detail('', 'BKS-02')).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('returns nothing for a branch belonging to another tenant', async () => {
    // Not an error message naming the branch: that would confirm it exists.
    expect(await service().detail('tenant-lain', 'BKS-02')).toBeNull();
  });

  it('carries the branch identity the header shows', async () => {
    const { outlet } = await service().detail(TENANT, 'BKS-02');

    expect(outlet.code).toBe('BKS-02');
    expect(outlet.name).toBe('Bekasi Timur');
    expect(outlet.manager).toBe('Dwi Kurnia');
    expect(outlet.openedAt).toBe('2021-03-01');
  });

  it('reports the same headline rating the network map shows', async () => {
    const { rating } = await service().detail(TENANT, 'BKS-02');

    // The map means every review; screen 04 must not quietly use a different
    // window and disagree with it about the same branch.
    expect(rating.mean).toBe(3.8);
    expect(rating.reviewCount).toBe(160);
  });

  it('compares four weeks against the four before, and says which', async () => {
    const { rating } = await service().detail(TENANT, 'BKS-02');

    expect(rating.blockWeeks).toBe(BLOCK_WEEKS);
    expect(rating.delta).toBe(Number((rating.recentMean - rating.priorMean).toFixed(2)));
    expect(rating.delta).toBeLessThan(0);
  });

  it('weights the block mean by review count, not by week', async () => {
    const { rating, trend } = await service().detail(TENANT, 'BKS-02');
    const last = trend.points.slice(-BLOCK_WEEKS);

    const weighted =
      last.reduce((sum, p) => sum + p.rating * p.reviewCount, 0) /
      last.reduce((sum, p) => sum + p.reviewCount, 0);
    const unweighted = last.reduce((sum, p) => sum + p.rating, 0) / last.length;

    expect(rating.recentMean).toBe(Number(weighted.toFixed(2)));
    // The two differ here, so the assertion above is actually load-bearing.
    expect(Number(weighted.toFixed(2))).not.toBe(Number(unweighted.toFixed(2)));
  });

  it('charts the weeks that exist rather than the twelve the mockup drew', async () => {
    const { trend } = await service().detail(TENANT, 'BKS-02');

    expect(trend.weeks).toBe(TREND_WEEKS);
    expect(trend.points).toHaveLength(TREND_WEEKS);
    expect(trend.points.every((point) => point.rating !== null)).toBe(true);
  });

  it('dates every week so the axis is not decorative', async () => {
    const { trend } = await service().detail(TENANT, 'BKS-02');

    expect(trend.points[0].startsAt).toBe('2026-06-02');
    expect(trend.points.at(-1).startsAt).toBe('2026-07-21');
  });

  it('ranks the branch among its own tenant only', async () => {
    const { location } = await service().detail(TENANT, 'BKS-02');

    expect(location.of).toBe(6);
    // Bekasi Timur scores 71; only Depok (68) is weaker.
    expect(location.rank).toBe(5);
  });

  it('ranks the strongest branch first and the weakest last', async () => {
    const svc = service();
    const best = await svc.detail(TENANT, 'BGR-01');
    const worst = await svc.detail(TENANT, 'DPK-01');

    expect(best.location.rank).toBe(1);
    expect(worst.location.rank).toBe(worst.location.of);
  });

  it('says which factors were measured and which were surveyed', async () => {
    const { location } = await service().detail(TENANT, 'BKS-02');

    // A surveyed footfall figure presented as measured is the untraceable
    // number the constitution forbids.
    expect(location.derivedFactors).toContain('competitors');
    expect(location.surveyedFactors).toEqual(
      expect.arrayContaining(['traffic', 'mix', 'access']),
    );
    expect(Object.keys(location.factorLabels)).toEqual(Object.keys(location.factors));
  });

  it('breaks complaints into themes that sum to the complaint count', async () => {
    const { themes, complaintCount } = await service().detail(TENANT, 'BKS-02');

    expect(themes[0].theme).toBe('antrean-kasir');
    expect(themes[0].count).toBe(31);
    expect(themes.reduce((sum, theme) => sum + theme.count, 0)).toBe(complaintCount);
  });

  it('gives each theme a share of the complaints, not of all reviews', async () => {
    const { themes, complaintCount, rating } = await service().detail(TENANT, 'BKS-02');

    expect(themes[0].share).toBe(Number((themes[0].count / complaintCount).toFixed(3)));
    expect(complaintCount).toBeLessThan(rating.reviewCount);
  });

  it('counts the branch queue so the button can say how much work is waiting', async () => {
    const { queue } = await service().detail(TENANT, 'BKS-02');

    expect(queue.unreplied).toBe(12);
    expect(queue.needsAction).toBe(9);
    expect(queue.needsAction).toBeLessThanOrEqual(queue.unreplied);
  });

  it('lists the competitors inside the radius with their distances', async () => {
    const { nearby } = await service().detail(TENANT, 'BKS-02');

    expect(nearby.radiusM).toBe(1000);
    expect(nearby.total).toBe(5);
    expect(nearby.pois.every((poi) => poi.distanceM <= nearby.radiusM)).toBe(true);
  });
});

describe('outletService change-point line (T034)', () => {
  it('draws no line for a branch with no recorded opening', async () => {
    const { event, nearby } = await service().detail(TENANT, 'BKS-02');

    // SCREENS.md put the line here; the Places response has no opening here.
    expect(event).toBeNull();
    expect(nearby.newSinceCount).toBe(0);
  });

  it('places the line on the week the opening actually happened', async () => {
    const { event } = await service().detail(TENANT, 'DPK-01');

    expect(event.name).toBe('Mitra Mart Margonda');
    expect(event.openedAt).toBe('2026-06-28');
    expect(event.week).toBe(4);
    expect(event.distanceM).toBe(400);
  });

  it('reports what the rating did that week without claiming a cause', async () => {
    const { event } = await service().detail(TENANT, 'DPK-01');

    expect(event.ratingMoved).toEqual({ from: 3.75, to: 3.44, delta: -0.31 });
    // No field asserts causation, and none may be added without a spec change.
    expect(event).not.toHaveProperty('cause');
    expect(event).not.toHaveProperty('causedBy');
  });

  it('keeps detected change points separate from the opening', async () => {
    const { trend, event } = await service().detail(TENANT, 'DPK-01');

    expect(trend.changePoints.length).toBeGreaterThan(1);
    // The biggest drop is not the event week; joining them would have hidden that.
    const biggest = [...trend.changePoints].sort((a, b) => a.delta - b.delta)[0];
    expect(biggest.week).not.toBe(event.week);
  });

  it('cites a place id for the opening so the claim can be checked', async () => {
    const { event } = await service().detail(TENANT, 'DPK-01');

    expect(event.placeId).toMatch(/^poi-DPK-01-/);
  });
});

describe('outletService.list (T034)', () => {
  it('needs a tenant', async () => {
    await expect(service().list('')).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('puts the branch that needs attention at the top', async () => {
    const rows = await service().list(TENANT);

    expect(rows).toHaveLength(6);
    expect(rows[0].outletId).toBe('DPK-01');
    expect(rows.map((row) => row.score)).toEqual([...rows.map((row) => row.score)].sort((a, b) => a - b));
  });

  it('counts every source behind the screen', async () => {
    const { sourceCount, rating, nearby } = await service().detail(TENANT, 'BKS-02');

    expect(sourceCount).toBe(rating.reviewCount + nearby.total);
  });
});
