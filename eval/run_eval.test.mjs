import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { THRESHOLDS, checkGates, loadGoldenSet, scoreResults } from './run_eval.mjs';

// fileURLToPath, not `.pathname`: a Windows path containing a space comes back
// percent-encoded from `.pathname` and the file is never found.
const GOLDEN = fileURLToPath(new URL('golden_set.jsonl', import.meta.url));

const result = (category, passed, ms = 1) => ({ id: `${category}-x`, category, passed, ms });

describe('golden set', () => {
  it('holds 60 cases, as T050 requires', async () => {
    const cases = await loadGoldenSet(GOLDEN);

    expect(cases).toHaveLength(60);
  });

  it('gives every case an id, a category and an expectation', async () => {
    const cases = await loadGoldenSet(GOLDEN);

    for (const testCase of cases) {
      expect(testCase.id, JSON.stringify(testCase)).toEqual(expect.any(String));
      expect(testCase.category).toMatch(/^(theme|citation|brand_voice|refusal|isolation)$/);
      expect(testCase.input).toBeTypeOf('object');
      expect(testCase.expect).toBeTypeOf('object');
    }
  });

  it('has no duplicate ids', async () => {
    const ids = (await loadGoldenSet(GOLDEN)).map((c) => c.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every complaint theme, so accuracy is not an average over two of them', async () => {
    const cases = await loadGoldenSet(GOLDEN);
    const themes = new Set(cases.filter((c) => c.category === 'theme').map((c) => c.expect.theme));

    expect(themes.size).toBe(6);
  });

  it('does not reuse the seed generator\'s own review sentences', async () => {
    // If the eval quoted the templates the dataset was built from, theme
    // accuracy would be a tautology rather than a measurement.
    const { COMPLAINT_TEMPLATES } = await import('@lokus/core');
    const seeded = new Set(Object.values(COMPLAINT_TEMPLATES).flat());
    const cases = await loadGoldenSet(GOLDEN);

    for (const testCase of cases.filter((c) => c.category === 'theme')) {
      expect(seeded.has(testCase.input.text), testCase.id).toBe(false);
    }
  });

  it('rejects a malformed line rather than silently skipping it', async () => {
    const notJsonl = fileURLToPath(new URL('run_eval.mjs', import.meta.url));

    await expect(loadGoldenSet(notJsonl)).rejects.toThrow(/not valid JSON/);
  });
});

describe('thresholds', () => {
  it('matches the constitution\'s quality gates', () => {
    expect(THRESHOLDS.theme_accuracy.min).toBe(0.85);
    expect(THRESHOLDS.citation_correctness.min).toBe(0.9);
    expect(THRESHOLDS.brand_voice_compliance.min).toBe(0.8);
    expect(THRESHOLDS.hallucination_rate.max).toBe(0.05);
    expect(THRESHOLDS.p95_latency_ms.max).toBe(10_000);
  });
});

describe('scoring', () => {
  it('scores each category independently', () => {
    const metrics = scoreResults([
      result('theme', true),
      result('theme', false),
      result('citation', true),
      result('brand_voice', true),
    ]);

    expect(metrics.theme_accuracy).toBe(0.5);
    expect(metrics.citation_correctness).toBe(1);
    expect(metrics.brand_voice_compliance).toBe(1);
  });

  it('counts a refusal case that produced a citation as a hallucination', () => {
    const metrics = scoreResults([result('refusal', true), result('refusal', false)]);

    expect(metrics.hallucination_rate).toBe(0.5);
  });

  it('reports zero hallucination when every refusal held', () => {
    expect(scoreResults([result('refusal', true)]).hallucination_rate).toBe(0);
  });

  it('takes p95 latency across every case, not per category', () => {
    const results = Array.from({ length: 100 }, (_, i) => result('theme', true, i + 1));

    expect(scoreResults(results).p95_latency_ms).toBe(95);
  });
});

describe('gates', () => {
  it('passes a run that meets every threshold', () => {
    const gates = checkGates({
      theme_accuracy: 0.9,
      citation_correctness: 0.95,
      brand_voice_compliance: 0.85,
      hallucination_rate: 0.0,
      p95_latency_ms: 500,
    });

    expect(gates.every((gate) => gate.passed)).toBe(true);
  });

  it('fails the exact boundary the constitution forbids', () => {
    // hallucination_rate is "< 0.05", so 0.05 itself must not pass.
    const gates = checkGates({
      theme_accuracy: 0.85,
      citation_correctness: 0.9,
      brand_voice_compliance: 0.8,
      hallucination_rate: 0.05,
      p95_latency_ms: 10_000,
    });
    const byKey = Object.fromEntries(gates.map((gate) => [gate.key, gate.passed]));

    // Minimums are inclusive; maximums are strict.
    expect(byKey.theme_accuracy).toBe(true);
    expect(byKey.citation_correctness).toBe(true);
    expect(byKey.brand_voice_compliance).toBe(true);
    expect(byKey.hallucination_rate).toBe(false);
    expect(byKey.p95_latency_ms).toBe(false);
  });

  it('reports the threshold alongside the value, so a failure explains itself', () => {
    const [gate] = checkGates({ theme_accuracy: 0.1 });

    expect(gate).toMatchObject({ label: expect.any(String), threshold: '>= 0.85', passed: false });
  });
});
