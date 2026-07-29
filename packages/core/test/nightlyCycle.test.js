import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { MAX_DECISIONS, runNightlyCycle } from '../src/briefing/nightlyCycle.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import { createMemoryWarehouse } from '../src/pipeline/warehouse.js';

const TENANT = 'nusa-retail';

const run = (overrides = {}) =>
  runNightlyCycle({
    tenantId: TENANT,
    gbp: createSeededGbpAdapter(),
    warehouse: createMemoryWarehouse(),
    ...overrides,
  });

describe('nightly cycle (AC-1.1, AC-1.4)', () => {
  it('hands the briefing over at 06.00, after a 23.00 start', async () => {
    const briefing = await run();

    expect(briefing.windowStart).toBe('23.00');
    expect(briefing.windowEnd).toBe('06.00');
    expect(briefing.timeline.at(-1)).toMatchObject({ time: '06.00', handover: true });
  });

  it('reports what the agents actually did, with real counts (AC-1.4)', async () => {
    const briefing = await run();

    const read = briefing.timeline.find((node) => node.title.includes('membaca'));
    expect(read.title).toContain(String(briefing.reviewsRead));
    expect(briefing.reviewsRead).toBeGreaterThan(0);
    expect(read.detail).toMatch(/\d+ cabang · \d+ tema terdeteksi/);
  });

  it('puts the agent that did not run on the timeline rather than skipping the slot', async () => {
    const briefing = await run();

    const skipped = briefing.timeline.find((node) => node.unavailable);
    expect(skipped.agent).toBe('location');
    expect(skipped.detail).toMatch(/belum aktif/);
  });

  it('produces at most three decisions', async () => {
    const briefing = await run();

    expect(MAX_DECISIONS).toBe(3);
    expect(briefing.decisions.length).toBeGreaterThan(0);
    expect(briefing.decisions.length).toBeLessThanOrEqual(MAX_DECISIONS);
  });

  it('never spends two decisions on the same theme', async () => {
    const briefing = await run();
    const themes = briefing.decisions.map((d) => d.theme).filter(Boolean);

    expect(new Set(themes).size).toBe(themes.length);
  });

  it('gives every decision its evidence and a proposed action (AC-1.2)', async () => {
    const briefing = await run();

    for (const decision of briefing.decisions) {
      expect(decision.evidence.length).toBeGreaterThan(0);
      expect(decision.body).toMatch(/Usulan agen|usulan agen/);
      expect(decision.actions.length).toBeGreaterThanOrEqual(2);
      expect(decision.rank).toEqual(expect.any(Number));
    }
  });

  it('ranks decisions by the weight of evidence behind them', async () => {
    const briefing = await run();
    const ranks = briefing.decisions.map((d) => d.rank);

    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(briefing.decisions[0].evidence.join(' ')).toMatch(/\d+ keluhan/);
  });

  it('leads with the systemic finding when one exists', async () => {
    const briefing = await run();

    expect(briefing.decisions[0].title).toMatch(/sistemik/);
  });

  it('reports the knowledge coverage it measured, not a figure for the slide', async () => {
    const briefing = await run();
    const knowledge = briefing.timeline.find((node) => node.agent === 'knowledge');

    expect(knowledge.detail).toMatch(/cakupan jawaban \d+%/);
  });

  it('estimates the cost of the cycle', async () => {
    const briefing = await run();

    expect(briefing.costIdr).toBeGreaterThan(0);
  });

  it('loads the reviews into the warehouse on the way through', async () => {
    const warehouse = createMemoryWarehouse();

    const briefing = await run({ warehouse });

    expect(await warehouse.listReviews(TENANT)).toHaveLength(briefing.reviewsRead);
  });

  it('produces nothing to decide for a tenant with no data', async () => {
    const briefing = await run({ tenantId: 'klinik-sehat-prima' });

    expect(briefing.reviewsRead).toBe(0);
    expect(briefing.decisions.every((d) => d.agent === 'Agen Pengetahuan')).toBe(true);
  });

  it('refuses to run without a tenant id', async () => {
    await expect(
      runNightlyCycle({ gbp: createSeededGbpAdapter(), warehouse: createMemoryWarehouse() }),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('logs the run with its tenant id', async () => {
    const lines = [];

    await run({ logger: { info: (fields) => lines.push(fields) } });

    expect(lines.some((line) => line.event === 'nightly.cycle' && line.tenantId === TENANT)).toBe(true);
  });
});
