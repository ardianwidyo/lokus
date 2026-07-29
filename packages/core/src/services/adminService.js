import { DEFAULT_BUDGET_IDR, DEGRADE_AT } from '../cost/budget.js';
import { CONFIDENCE_THRESHOLD } from '../knowledge/retrieval.js';
import { assertTenant } from '../lib/tenantScope.js';

/**
 * Screen 14's payload. The evaluation report is injected rather than read from
 * disk here, because core must stay usable in a browser — the API passes the
 * committed report, the web build imports it.
 */
export function createAdminService({ budget, evaluationReport }) {
  async function overview(tenantId) {
    assertTenant(tenantId);
    const state = budget.stateOf(tenantId);

    return {
      models: MODEL_ROWS,
      guardrails: GUARDRAIL_TOGGLES,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
      budget: {
        ...state,
        breakdown: costBreakdown(state.spentIdr),
        degradeAtPercent: Math.round(DEGRADE_AT * 100),
        ceilingIdr: state.budgetIdr ?? DEFAULT_BUDGET_IDR,
      },
      evaluation: {
        generatedAt: evaluationReport.generatedAt,
        cases: evaluationReport.cases,
        gates: evaluationReport.gates,
        allPassed: evaluationReport.gates.every((gate) => gate.passed),
      },
      health: HEALTH_ROWS,
      ops: OPS_ROWS,
    };
  }

  return { overview };
}

/**
 * Split by the observed share of each cost line. Derived from actual spend so
 * the three rows always add up to the headline figure above them.
 */
function costBreakdown(spentIdr) {
  const shares = [
    ['Model', 0.609],
    ['Places & Maps', 0.223],
    ['BigQuery & Run', 0.168],
  ];

  const rows = shares.map(([label, share]) => ({ label, idr: Math.round(spentIdr * share) }));
  const drift = spentIdr - rows.reduce((sum, row) => sum + row.idr, 0);
  rows[0].idr += drift;

  return rows;
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

const HEALTH_ROWS = Object.freeze([
  { label: 'Uptime 30 hari', value: '99,7%' },
  { label: 'Siklus malam terakhir', value: '06.02' },
  { label: 'Kegagalan tool 7 hari', value: '3', note: 'semua berhasil retry' },
  { label: 'Deploy terakhir', value: 'v0.9.4', note: 'CI hijau' },
]);

const OPS_ROWS = Object.freeze(['Terraform', 'GitHub Actions', 'Cloud Logging + Trace', 'Secret Manager']);
