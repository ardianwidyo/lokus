import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import {
  createKnowledgeAgent,
  createReputationAgent,
  createUnavailableAgent,
} from '../src/agents/specialists.js';
import { INTENTS, detectOutlet, route } from '../src/agents/intent.js';
import { createSupervisor, estimateCostIdr } from '../src/agents/supervisor.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';

const TENANT = 'nusa-retail';

const buildSupervisor = (overrides = {}) =>
  createSupervisor({
    agents: {
      reputation: createReputationAgent({ gbp: createSeededGbpAdapter() }),
      knowledge: createKnowledgeAgent(),
      location: createUnavailableAgent(
        'location',
        'Agen Lokasi',
        'Agen Lokasi belum aktif pada build ini (fase P3).',
      ),
      ...overrides,
    },
  });

describe('supervisor.route (AC-7.1)', () => {
  it.each([
    ['Kenapa rating cabang Bekasi Timur turun bulan ini?', INTENTS.DIAGNOSIS_CABANG],
    ['Ringkas keluhan pekan ini', INTENTS.RINGKAS_REVIEW],
    ['Apa kata SOP soal refund?', INTENTS.PERTANYAAN_KEBIJAKAN],
    ['Cari lokasi cabang baru di Jakarta Timur', INTENTS.CARI_LOKASI],
    ['Bandingkan kandidat A dan B', INTENTS.BANDINGKAN_LOKASI],
  ])('routes %p to %s', (question, intent) => {
    expect(route({ question }).intent).toBe(intent);
  });

  it('falls back to a knowledge lookup rather than guessing', () => {
    const plan = route({ question: 'Halo' });

    expect(plan.intent).toBe(INTENTS.LAIN);
    expect(plan.agents).toEqual(['knowledge']);
  });

  it('sends a diagnosis question to all three agents', () => {
    const plan = route({ question: 'Kenapa rating Bekasi Timur turun?' });

    expect(plan.agents).toEqual(expect.arrayContaining(['reputation', 'location', 'knowledge']));
  });

  it('picks the outlet out of the question', () => {
    expect(detectOutlet('kenapa Bekasi Timur turun')?.outletId).toBe('BKS-02');
    expect(detectOutlet('bagaimana DPK-01')?.outletId).toBe('DPK-01');
    expect(detectOutlet('tidak menyebut cabang')).toBeNull();
  });

  it('takes the outlet from context when the question does not name one', () => {
    expect(route({ question: 'Kenapa turun?', context: { outletId: 'SRP-03' } }).outletId).toBe(
      'SRP-03',
    );
  });
});

describe('supervisor.ask', () => {
  it('answers a branch diagnosis by merging findings from several agents', async () => {
    const run = await buildSupervisor().ask({
      tenantId: TENANT,
      question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
    });

    expect(run.refused).toBe(false);
    expect(run.intent).toBe(INTENTS.DIAGNOSIS_CABANG);
    expect(run.answer).toMatch(/Bekasi Timur/);
    expect(run.answer).toMatch(/Antrean kasir/);
    expect(run.findings.length).toBeGreaterThan(1);
  });

  it('records a numbered trace with tool, result size and latency (AC-7.2)', async () => {
    const run = await buildSupervisor().ask({
      tenantId: TENANT,
      question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
    });

    expect(run.steps[0].tool).toBe('supervisor.route');
    expect(run.steps.at(-1).tool).toBe('guardrail.check');
    expect(run.steps.map((s) => s.n)).toEqual(run.steps.map((_, i) => i + 1));
    for (const step of run.steps) {
      expect(step).toMatchObject({
        tool: expect.any(String),
        resultSize: expect.any(Number),
        ms: expect.any(Number),
      });
    }
  });

  it('runs the agents concurrently rather than one after another', async () => {
    const slow = (name) => ({
      name,
      async run({ startStep }) {
        await new Promise((resolve) => setTimeout(resolve, 60));
        return {
          agent: name,
          findings: [{ agent: name, text: `${name} selesai`, sourceCount: 1 }],
          sources: [{ type: 'review', id: `${name}-1` }],
          steps: [{ n: startStep, tool: `${name}.work`, resultSize: 1, ms: 60 }],
          nextStep: startStep + 1,
        };
      },
    });

    const supervisor = createSupervisor({
      agents: { reputation: slow('reputation'), location: slow('location'), knowledge: slow('knowledge') },
    });

    const started = Date.now();
    await supervisor.ask({ tenantId: TENANT, question: 'Kenapa rating Bekasi Timur turun?' });
    const elapsed = Date.now() - started;

    // Three 60ms agents in sequence would take 180ms or more.
    expect(elapsed).toBeLessThan(150);
  });

  it('refuses when nothing it found can be sourced (constitution I)', async () => {
    const empty = (name) => ({
      name,
      async run({ startStep }) {
        return {
          agent: name,
          // Findings that read convincingly but cite nothing must not survive.
          findings: [{ agent: name, text: 'Rating turun karena cuaca.', sourceCount: 0 }],
          sources: [],
          steps: [{ n: startStep, tool: `${name}.work`, resultSize: 0, ms: 1 }],
          nextStep: startStep + 1,
        };
      },
    });

    const run = await createSupervisor({ agents: { knowledge: empty('knowledge') } }).ask({
      tenantId: TENANT,
      question: 'Kenapa rating turun?',
    });

    expect(run.refused).toBe(true);
    expect(run.answer).toMatch(/Tidak ada di dokumen/);
    expect(run.answer).not.toMatch(/cuaca/);
  });

  it('still records the trace when it refuses', async () => {
    const run = await createSupervisor({ agents: {} }).ask({
      tenantId: TENANT,
      question: 'Pertanyaan tanpa agen',
    });

    expect(run.refused).toBe(true);
    expect(run.steps.length).toBeGreaterThanOrEqual(2);
  });

  it('says which perspective is missing instead of omitting it silently', async () => {
    const run = await buildSupervisor().ask({
      tenantId: TENANT,
      question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
    });

    expect(run.unavailable).toEqual([
      { agent: 'location', reason: expect.stringMatching(/belum aktif/) },
    ]);
    expect(run.answer).toMatch(/belum memperhitungkan hal itu/);
  });

  it('summarises its sources into the tags shown under the answer', async () => {
    const run = await buildSupervisor().ask({
      tenantId: TENANT,
      question: 'Apa kata SOP soal antrean kasir?',
    });

    expect(run.sourceSummary.some((tag) => /hal\. \d+/.test(tag))).toBe(true);
  });

  it('runs the guardrails over its own answer', async () => {
    const run = await buildSupervisor().ask({
      tenantId: TENANT,
      question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
    });

    expect(run.guardrail.checks).toHaveLength(4);
    expect(run.guardrail.passed).toBe(true);
  });

  it('reports a per-answer cost and latency (AC-7.4)', async () => {
    const run = await buildSupervisor().ask({
      tenantId: TENANT,
      question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
    });

    expect(run.costIdr).toBeGreaterThan(0);
    expect(run.latencyMs).toBeGreaterThanOrEqual(0);
    expect(estimateCostIdr({ stepCount: 7, sourceCount: 20 })).toBe(318);
  });

  it('refuses to run without a tenant id', async () => {
    await expect(buildSupervisor().ask({ question: 'apa saja' })).rejects.toBeInstanceOf(
      TenantScopeError,
    );
  });

  it('returns nothing sourced for a tenant that owns no data', async () => {
    const run = await buildSupervisor().ask({
      tenantId: 'klinik-sehat-prima',
      question: 'Kenapa rating cabang Bekasi Timur turun?',
    });

    expect(run.refused).toBe(true);
    expect(run.sources).toEqual([]);
  });
});
