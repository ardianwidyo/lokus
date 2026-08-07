import {
  DEFAULT_LOCALE,
  createAdminService,
  createBudgetGuard,
  createSeededGbpAdapter,
} from '@lokus/core';

import evalReport from '../../../eval/report.sample.json';

/**
 * Admin data for screen 14 — the production-readiness evidence a judge can
 * check rather than take on trust.
 *
 * The eval table is read from a report the runner produced, not typed in. If
 * `eval/report.sample.json` drifts from what `npm run eval` outputs, the CI
 * eval job is the thing that catches it, because both come from the same
 * runner.
 *
 * The row content itself lives in `packages/core/src/services/adminService.js`
 * — the same function the API's `/v1/admin/overview` calls — so the seeded
 * console and a deployed one show the same models, guardrails and cost
 * breakdown rather than two hand-maintained copies that can drift.
 */
export function createSeededAdminSource({
  tenantId = 'nusa-retail',
  locale = DEFAULT_LOCALE,
  // The workspace's adapter, so the response-time coverage on screen 14 counts
  // the same rows screen 05 is showing (AC-9.5).
  gbp = null,
} = {}) {
  const budget = createBudgetGuard();
  // Month-to-date spend for the demo tenant (design/SCREENS.md screen 14).
  budget.seed(tenantId, 1_840_000);

  // The same adapter the reputation source reads, so the coverage figures on
  // screen 14 describe the reviews screen 05 is showing (spec AC-9.5).
  const service = createAdminService({
    budget,
    evaluationReport: evalReport,
    gbp: gbp ?? createSeededGbpAdapter(),
  });

  return {
    isSeeded: true,
    overview: () => service.overview(tenantId, { locale }),
  };
}
