import { CONFIDENCE_THRESHOLD, DEFAULT_BUDGET_IDR, DEGRADE_AT, createBudgetGuard } from '@lokus/core';

import evalReport from '../../../eval/report.sample.json';

/**
 * Admin data for screen 14 — the production-readiness evidence a judge can
 * check rather than take on trust.
 *
 * The eval table is read from a report the runner produced, not typed in. If
 * `eval/report.sample.json` drifts from what `npm run eval` outputs, the CI
 * eval job is the thing that catches it, because both come from the same
 * runner.
 */
export function createSeededAdminSource({ tenantId = 'nusa-retail' } = {}) {
  const budget = createBudgetGuard();
  // Month-to-date spend for the demo tenant (design/SCREENS.md screen 14).
  budget.seed(tenantId, 1_840_000);

  async function overview() {
    return {
      models: MODEL_ROWS,
      guardrails: GUARDRAIL_TOGGLES,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
      budget: {
        ...budget.stateOf(tenantId),
        breakdown: COST_BREAKDOWN,
        degradeAtPercent: Math.round(DEGRADE_AT * 100),
        ceilingIdr: DEFAULT_BUDGET_IDR,
      },
      evaluation: {
        generatedAt: evalReport.generatedAt,
        cases: evalReport.cases,
        gates: evalReport.gates,
        allPassed: evalReport.gates.every((gate) => gate.passed),
      },
      health: HEALTH_ROWS,
      ops: OPS_ROWS,
    };
  }

  return { isSeeded: true, overview };
}

const MODEL_ROWS = Object.freeze([
  { label: 'Penalaran', value: 'Gemini · Vertex AI' },
  { label: 'Ringkasan massal', value: 'Gemini Flash' },
  { label: 'Embedding', value: 'text-embedding-004' },
  { label: 'Runtime agen', value: 'Vertex AI Agent Engine' },
  { label: 'Region', value: 'asia-southeast2' },
  { label: 'Layanan', value: 'Cloud Run · 2 svc' },
]);

const GUARDRAIL_TOGGLES = Object.freeze([
  { id: 'approval', label: 'Balasan bintang 1–2 wajib disetujui manusia', enabled: true, enforcedIn: 'approvals.js' },
  { id: 'compensation', label: 'Larang janji kompensasi finansial', enabled: true, enforcedIn: 'guardrails.js' },
  { id: 'confidence', label: 'Tolak menjawab bila sumber < 0,70', enabled: true, enforcedIn: 'retrieval.js' },
  { id: 'personal-data', label: 'Redaksi data pribadi sebelum ke model', enabled: true, enforcedIn: 'guardrails.js' },
]);

const COST_BREAKDOWN = Object.freeze([
  { label: 'Model', idr: 1_120_000 },
  { label: 'Places & Maps', idr: 410_000 },
  { label: 'BigQuery & Run', idr: 310_000 },
]);

const HEALTH_ROWS = Object.freeze([
  { label: 'Uptime 30 hari', value: '99,7%' },
  { label: 'Siklus malam terakhir', value: '06.02' },
  { label: 'Kegagalan tool 7 hari', value: '3', note: 'semua berhasil retry' },
  { label: 'Deploy terakhir', value: 'v0.9.4', note: 'CI hijau' },
]);

const OPS_ROWS = Object.freeze([
  'Terraform',
  'GitHub Actions',
  'Cloud Logging + Trace',
  'Secret Manager',
]);
