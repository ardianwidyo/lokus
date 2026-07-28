import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import { loadReviewFacts } from '../src/pipeline/loadReviews.js';
import { createMemoryWarehouse } from '../src/pipeline/warehouse.js';

const TENANT = 'nusa-retail';

const run = (overrides = {}) =>
  loadReviewFacts({
    tenantId: TENANT,
    gbp: createSeededGbpAdapter(),
    warehouse: createMemoryWarehouse(),
    ...overrides,
  });

describe('nightly review load', () => {
  it('lands the raw payload before writing facts, so a reload needs no API call', async () => {
    const warehouse = createMemoryWarehouse();

    await run({ warehouse });

    expect(await warehouse.landingCount(TENANT)).toBe(1);
  });

  it('inserts every review on the first run', async () => {
    const warehouse = createMemoryWarehouse();

    const summary = await run({ warehouse });

    expect(summary.inserted).toBe(summary.read);
    expect(summary.updated).toBe(0);
    expect(await warehouse.listReviews(TENANT)).toHaveLength(summary.read);
  });

  it('is idempotent — a second run updates instead of duplicating', async () => {
    const warehouse = createMemoryWarehouse();
    const gbp = createSeededGbpAdapter();

    const first = await run({ warehouse, gbp });
    const second = await run({ warehouse, gbp });

    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(first.read);
    expect(await warehouse.listReviews(TENANT)).toHaveLength(first.read);
  });

  it('leaves themes empty, because clustering owns them (AC-2.1)', async () => {
    const warehouse = createMemoryWarehouse();

    await run({ warehouse });
    const rows = await warehouse.listReviews(TENANT);

    expect(rows.every((row) => Array.isArray(row.themes) && row.themes.length === 0)).toBe(true);
  });

  it('keeps themes a previous run assigned when the review is reloaded', async () => {
    const warehouse = createMemoryWarehouse();
    const gbp = createSeededGbpAdapter();
    await run({ warehouse, gbp });

    await warehouse.setThemes(TENANT, 'rev-BKS-02-featured-1', [{ theme: 'antrean-kasir', score: 0.9 }]);
    await run({ warehouse, gbp });

    const [row] = await warehouse.listReviews(TENANT, { outletId: 'BKS-02' }).then((rows) =>
      rows.filter((r) => r.id === 'rev-BKS-02-featured-1'),
    );
    expect(row.themes).toEqual([{ theme: 'antrean-kasir', score: 0.9 }]);
  });

  it('refuses to run without a tenant id', async () => {
    await expect(
      loadReviewFacts({
        gbp: createSeededGbpAdapter(),
        warehouse: createMemoryWarehouse(),
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('refuses to write a row belonging to another tenant', async () => {
    const warehouse = createMemoryWarehouse();

    await expect(
      warehouse.mergeReviews(TENANT, [{ id: 'x', tenantId: 'klinik-sehat-prima' }]),
    ).rejects.toThrow(/does not belong to tenant/);
  });

  it('loads nothing for a tenant that owns no reviews', async () => {
    const warehouse = createMemoryWarehouse();

    const summary = await run({ warehouse, tenantId: 'klinik-sehat-prima' });

    expect(summary.read).toBe(0);
    expect(await warehouse.listReviews('klinik-sehat-prima')).toHaveLength(0);
  });

  it('logs the run with its tenant id', async () => {
    const lines = [];

    await run({ logger: { info: (fields, message) => lines.push({ fields, message }) } });

    expect(lines[0].fields.tenantId).toBe(TENANT);
    expect(lines[0].fields.event).toBe('review.load');
  });
});
