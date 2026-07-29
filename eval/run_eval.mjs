#!/usr/bin/env node
/**
 * LOKUS agent evaluation.
 *
 * Runs `golden_set.jsonl` against @lokus/core and checks the five quality gates
 * the constitution requires before a deploy:
 *
 *   theme accuracy         >= 0.85
 *   citation correctness   >= 0.90
 *   brand-voice compliance >= 0.80
 *   hallucination rate     <  0.05
 *   p95 latency            <  10 s
 *
 * Exits non-zero when any gate fails, so CI blocks the merge rather than
 * printing a number nobody reads.
 *
 * Recorded deviation (plan.md): tasks.md T050 names run_eval.py. The system
 * under test is JavaScript, so the runner is Node and CI carries one runtime.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import {
  classifyReview,
  createSeededGbpAdapter,
  draftReply,
  guardrailCheck,
  searchPassages,
  themeCluster,
} from '@lokus/core';

const TENANT = 'nusa-retail';

/** From `.specify/memory/constitution.md`, "Quality Gates". */
export const THRESHOLDS = Object.freeze({
  theme_accuracy: { min: 0.85, label: 'Ketepatan tema keluhan' },
  citation_correctness: { min: 0.9, label: 'Sitasi benar & relevan' },
  brand_voice_compliance: { min: 0.8, label: 'Kepatuhan nada brand' },
  hallucination_rate: { max: 0.05, label: 'Halusinasi terdeteksi' },
  p95_latency_ms: { max: 10_000, label: 'Latensi p95' },
});

export async function loadGoldenSet(path) {
  const text = await readFile(path, 'utf8');
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`golden_set.jsonl line ${index + 1} is not valid JSON: ${error.message}`);
      }
    });
}

/** Runs one case and returns { passed, detail, ms }. */
async function runCase(testCase, context) {
  const startedAt = performance.now();
  const result = await evaluate(testCase, context);
  return { ...result, ms: performance.now() - startedAt };
}

async function evaluate(testCase, { gbp, reviews }) {
  const { category, input, expect } = testCase;

  if (category === 'theme') {
    const classified = classifyReview(input.text);
    const actual = classified?.theme ?? null;
    return {
      passed: actual === expect.theme,
      detail: actual === expect.theme ? actual : `diharapkan ${expect.theme}, dapat ${actual ?? 'tidak ada'}`,
    };
  }

  if (category === 'citation') {
    const { chunks } = searchPassages({ tenantId: TENANT, query: input.question, topK: 3 });
    const hit = chunks.find((c) => c.docId === expect.docId && c.page === expect.page);
    return {
      passed: Boolean(hit),
      detail: hit
        ? `${hit.docId} hal. ${hit.page} (skor ${hit.score})`
        : `diharapkan ${expect.docId} hal. ${expect.page}, dapat ${
            chunks.map((c) => `${c.docId} hal. ${c.page}`).join(', ') || 'tidak ada kutipan'
          }`,
    };
  }

  if (category === 'brand_voice') {
    const review = {
      id: `eval-${testCase.id}`,
      tenantId: TENANT,
      outletId: input.outletId,
      rating: input.rating,
      author: input.author,
      text: input.text,
    };
    const draft = await draftReply({ tenantId: TENANT, review });

    if (!draft.data.drafted) {
      return { passed: false, detail: `agen menolak membuat draft: ${draft.data.reason}` };
    }

    const guardrail = guardrailCheck({
      draftText: draft.data.text,
      citations: draft.data.citations,
    });
    const failed = guardrail.data.checks.filter((check) => !check.passed);

    return {
      passed: guardrail.data.passedCount === expect.guardrailsPassed && draft.data.citations.length > 0,
      detail:
        failed.length === 0
          ? `${guardrail.data.summary} · ${draft.data.citations.length} sitasi`
          : `gagal: ${failed.map((c) => c.name).join(', ')}`,
    };
  }

  if (category === 'refusal') {
    const { chunks } = searchPassages({ tenantId: TENANT, query: input.question, topK: 3 });
    return {
      passed: chunks.length === 0,
      detail:
        chunks.length === 0
          ? 'menolak menjawab'
          : `mengarang: mengutip ${chunks.map((c) => `${c.docId} hal. ${c.page} (${c.score})`).join(', ')}`,
    };
  }

  if (category === 'isolation') {
    const tenantId = input.tenantId;

    if (input.tool === 'gbp.listReviews') {
      const { data } = await gbp.listReviews({ tenantId, limit: 10 });
      return { passed: data.reviews.length === 0, detail: `${data.reviews.length} review` };
    }
    if (input.tool === 'bq.themeCluster') {
      const { data } = await themeCluster({ tenantId, reviews });
      return { passed: data.themes.length === 0, detail: `${data.themes.length} tema` };
    }
    const { chunks } = searchPassages({ tenantId, query: 'antrean kasir jam sibuk' });
    return { passed: chunks.length === 0, detail: `${chunks.length} kutipan` };
  }

  throw new Error(`Unknown case category: ${category}`);
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function scoreResults(results) {
  const by = (category) => results.filter((r) => r.category === category);
  const rate = (rows) => (rows.length === 0 ? 1 : rows.filter((r) => r.passed).length / rows.length);

  const refusals = by('refusal');

  return {
    theme_accuracy: rate(by('theme')),
    citation_correctness: rate(by('citation')),
    brand_voice_compliance: rate(by('brand_voice')),
    // A refusal case that produced a citation is the agent inventing support
    // for an answer the corpus cannot back.
    hallucination_rate:
      refusals.length === 0 ? 0 : refusals.filter((r) => !r.passed).length / refusals.length,
    p95_latency_ms: percentile(results.map((r) => r.ms), 95),
    // Reported, not gated: isolation is a hard invariant asserted by unit tests
    // as well, and a single failure here is a release blocker on its own.
    tenant_isolation: rate(by('isolation')),
  };
}

export function checkGates(metrics) {
  return Object.entries(THRESHOLDS).map(([key, gate]) => {
    const value = metrics[key];
    const passed = gate.min !== undefined ? value >= gate.min : value < gate.max;
    return {
      key,
      label: gate.label,
      value,
      threshold: gate.min !== undefined ? `>= ${gate.min}` : `< ${gate.max}`,
      passed,
    };
  });
}

function formatValue(key, value) {
  if (key === 'p95_latency_ms') return `${value.toFixed(0)} ms`;
  return value.toFixed(3);
}

/**
 * `run_eval.mjs [golden-set-path] [--report out.json]`
 *
 * The value after `--report` is a flag's argument, not a positional one.
 * Scanning for "the first token that does not start with --" mistook it for the
 * golden set path and the runner tried to parse the report as JSONL.
 */
export function parseArgs(argv) {
  const positional = [];
  let reportPath = null;

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--report') {
      reportPath = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (!argv[i].startsWith('--')) positional.push(argv[i]);
  }

  return { goldenPath: positional[0] ?? null, reportPath };
}

export async function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv);
  const goldenPath =
    parsed.goldenPath ?? fileURLToPath(new URL('golden_set.jsonl', import.meta.url));
  const reportPath = parsed.reportPath;

  const goldenSet = await loadGoldenSet(goldenPath);
  const gbp = createSeededGbpAdapter();
  const reviews = (await gbp.listReviews({ tenantId: TENANT, limit: 5000 })).data.reviews;

  const results = [];
  for (const testCase of goldenSet) {
    const outcome = await runCase(testCase, { gbp, reviews });
    results.push({ id: testCase.id, category: testCase.category, ...outcome });
  }

  const metrics = scoreResults(results);
  const gates = checkGates(metrics);
  const failures = results.filter((r) => !r.passed);

  process.stdout.write(`\nLOKUS eval · ${results.length} kasus\n${'─'.repeat(64)}\n`);

  for (const gate of gates) {
    const mark = gate.passed ? 'LULUS' : 'GAGAL';
    process.stdout.write(
      `${mark.padEnd(6)} ${gate.label.padEnd(28)} ${formatValue(gate.key, gate.value).padStart(10)}  ambang ${gate.threshold}\n`,
    );
  }
  process.stdout.write(
    `${'—'.padEnd(6)} ${'Isolasi tenant'.padEnd(28)} ${metrics.tenant_isolation.toFixed(3).padStart(10)}  (dilaporkan)\n`,
  );

  if (failures.length > 0) {
    process.stdout.write(`\n${failures.length} kasus gagal:\n`);
    for (const failure of failures) {
      process.stdout.write(`  ${failure.id.padEnd(12)} ${failure.detail}\n`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    cases: results.length,
    metrics,
    gates,
    failures: failures.map(({ id, category, detail }) => ({ id, category, detail })),
  };

  if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const blocked = gates.filter((gate) => !gate.passed);
  if (metrics.tenant_isolation < 1) {
    process.stdout.write('\nISOLASI TENANT GAGAL — ini pemblokir rilis.\n');
  }

  process.stdout.write(
    blocked.length === 0 && metrics.tenant_isolation === 1
      ? '\nSemua ambang terpenuhi.\n\n'
      : `\n${blocked.length} ambang tidak terpenuhi.\n\n`,
  );

  return blocked.length === 0 && metrics.tenant_isolation === 1 ? 0 : 1;
}

// Only run when invoked directly, so the module stays importable by tests.
// Compared as filesystem paths: hand-building a file:// URL from argv mangles
// any Windows path containing a space.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().then((code) => process.exit(code));
}
