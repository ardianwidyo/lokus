import { assertTenant } from '../lib/tenantScope.js';

/**
 * Constitution V — "Cost Has a Ceiling".
 *
 * Per-tenant monthly budget enforced in code. Above 90% the system degrades to
 * the cheaper model tier and raises an alert; it never fails silently and never
 * exceeds the hard ceiling.
 *
 * The degrade point and the ceiling are deliberately different things. Degrading
 * keeps the product working on a cheaper model; the ceiling stops work entirely.
 * A system with only a ceiling fails at midnight on the 28th with no warning.
 */

export const MODEL_TIER = Object.freeze({
  REASONING: 'gemini-reasoning',
  FLASH: 'gemini-flash',
});

/** Fraction of budget at which the tier drops and an alert is raised. */
export const DEGRADE_AT = 0.9;

/** Default monthly ceiling per tenant, in rupiah (design/SCREENS.md screen 14). */
export const DEFAULT_BUDGET_IDR = 5_400_000;

export class BudgetExceededError extends Error {
  constructor(message, state) {
    super(message);
    this.name = 'BudgetExceededError';
    this.code = 'BUDGET_EXCEEDED';
    this.state = state;
  }
}

/**
 * Tracks spend and decides the tier. Firestore-backed in production; the
 * interface is the same either way, and the decision logic lives here so it is
 * testable without a database.
 */
export function createBudgetGuard({
  budgets = {},
  defaultBudgetIdr = DEFAULT_BUDGET_IDR,
  degradeAt = DEGRADE_AT,
  onAlert = null,
  now = () => new Date(),
} = {}) {
  /** `${tenantId}:${YYYY-MM}` → spent rupiah */
  const spend = new Map();
  /** Months already alerted, so one crossing raises one alert, not one per call. */
  const alerted = new Set();

  const period = (at = now()) => `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`;
  const key = (tenantId, at) => `${tenantId}:${period(at)}`;

  function budgetFor(tenantId) {
    return budgets[tenantId] ?? defaultBudgetIdr;
  }

  function stateOf(tenantId, at = now()) {
    assertTenant(tenantId);

    const budgetIdr = budgetFor(tenantId);
    const spentIdr = spend.get(key(tenantId, at)) ?? 0;
    const usedFraction = budgetIdr === 0 ? 1 : spentIdr / budgetIdr;

    return {
      tenantId,
      period: period(at),
      budgetIdr,
      spentIdr,
      remainingIdr: Math.max(0, budgetIdr - spentIdr),
      usedFraction: Number(usedFraction.toFixed(4)),
      usedPercent: Math.round(usedFraction * 100),
      degraded: usedFraction >= degradeAt,
      exhausted: usedFraction >= 1,
      tier: usedFraction >= degradeAt ? MODEL_TIER.FLASH : MODEL_TIER.REASONING,
      degradeAt,
    };
  }

  /**
   * The tier a call should use. Callers ask before spending, so a run that
   * crosses the line mid-month uses the cheap model for the rest of it.
   */
  function tierFor(tenantId, at = now()) {
    return stateOf(tenantId, at).tier;
  }

  /**
   * Reserves budget for a call. Refuses when the ceiling is already reached —
   * loudly, with the state attached, so the caller can show why rather than
   * returning an empty answer.
   */
  function reserve(tenantId, estimatedIdr, at = now()) {
    const before = stateOf(tenantId, at);

    if (before.exhausted) {
      throw new BudgetExceededError(
        `Anggaran bulan ${before.period} untuk tenant ini sudah habis (Rp ${before.spentIdr.toLocaleString('id-ID')} dari Rp ${before.budgetIdr.toLocaleString('id-ID')}).`,
        before,
      );
    }

    // The ceiling is hard: a call that would cross it is refused rather than
    // allowed to overshoot and be reported afterwards.
    if (before.spentIdr + estimatedIdr > before.budgetIdr) {
      throw new BudgetExceededError(
        `Panggilan ini akan melewati batas keras anggaran (perkiraan Rp ${estimatedIdr.toLocaleString('id-ID')}, sisa Rp ${before.remainingIdr.toLocaleString('id-ID')}).`,
        before,
      );
    }

    return { tier: before.tier, state: before };
  }

  /** Records actual spend after a call, and alerts on the first crossing. */
  function record(tenantId, actualIdr, at = now()) {
    assertTenant(tenantId);
    const id = key(tenantId, at);
    const before = stateOf(tenantId, at);

    spend.set(id, (spend.get(id) ?? 0) + Math.max(0, actualIdr));
    const after = stateOf(tenantId, at);

    if (!before.degraded && after.degraded && !alerted.has(id)) {
      alerted.add(id);
      // Never fails silently: crossing 90% raises an alert once per month.
      onAlert?.({
        kind: 'budget_degraded',
        tenantId,
        period: after.period,
        usedPercent: after.usedPercent,
        budgetIdr: after.budgetIdr,
        spentIdr: after.spentIdr,
        message: `Anggaran tenant terpakai ${after.usedPercent}%. Agen turun ke mode Flash sampai akhir bulan.`,
      });
    }

    return after;
  }

  /** Seeds month-to-date spend, e.g. from Firestore on boot. */
  function seed(tenantId, spentIdr, at = now()) {
    assertTenant(tenantId);
    spend.set(key(tenantId, at), spentIdr);
    return stateOf(tenantId, at);
  }

  return { stateOf, tierFor, reserve, record, seed, budgetFor };
}
