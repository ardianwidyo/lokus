import { describe, expect, it, vi } from 'vitest';

import {
  BudgetExceededError,
  DEFAULT_BUDGET_IDR,
  DEGRADE_AT,
  MODEL_TIER,
  createBudgetGuard,
} from '../src/cost/budget.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';

const TENANT = 'nusa-retail';
const AT = new Date('2026-07-15T00:00:00Z');

const guard = (options = {}) => createBudgetGuard({ now: () => AT, ...options });

describe('budget guard (constitution V)', () => {
  it('defaults to the ceiling the Admin screen shows', () => {
    expect(DEFAULT_BUDGET_IDR).toBe(5_400_000);
    expect(DEGRADE_AT).toBe(0.9);
  });

  it('uses the reasoning tier while there is room', () => {
    const budget = guard();
    budget.seed(TENANT, 1_840_000);

    const state = budget.stateOf(TENANT);

    expect(state.tier).toBe(MODEL_TIER.REASONING);
    expect(state.usedPercent).toBe(34);
    expect(state.degraded).toBe(false);
  });

  it('degrades to Flash at 90%, not at 100%', () => {
    // A system with only a hard ceiling fails at midnight with no warning.
    const budget = guard();
    budget.seed(TENANT, 0.9 * DEFAULT_BUDGET_IDR);

    expect(budget.tierFor(TENANT)).toBe(MODEL_TIER.FLASH);
    expect(budget.stateOf(TENANT).exhausted).toBe(false);
  });

  it('stays on the reasoning tier just below the degrade point', () => {
    const budget = guard();
    budget.seed(TENANT, 0.9 * DEFAULT_BUDGET_IDR - 1);

    expect(budget.tierFor(TENANT)).toBe(MODEL_TIER.REASONING);
  });

  it('raises an alert once when the tenant crosses 90%', () => {
    const onAlert = vi.fn();
    const budget = guard({ onAlert });
    budget.seed(TENANT, 0.85 * DEFAULT_BUDGET_IDR);

    budget.record(TENANT, 0.06 * DEFAULT_BUDGET_IDR);
    budget.record(TENANT, 1000);
    budget.record(TENANT, 1000);

    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert.mock.calls[0][0]).toMatchObject({
      kind: 'budget_degraded',
      tenantId: TENANT,
      usedPercent: expect.any(Number),
    });
  });

  it('never fails silently — the alert says what happens next', () => {
    const onAlert = vi.fn();
    const budget = guard({ onAlert });
    budget.seed(TENANT, 0.89 * DEFAULT_BUDGET_IDR);

    budget.record(TENANT, 0.02 * DEFAULT_BUDGET_IDR);

    expect(onAlert.mock.calls[0][0].message).toMatch(/model yang lebih murah \(Flash\)/);
  });

  it('refuses a call that would cross the hard ceiling', () => {
    const budget = guard();
    budget.seed(TENANT, 0.99 * DEFAULT_BUDGET_IDR);

    expect(() => budget.reserve(TENANT, 100_000)).toThrow(BudgetExceededError);
  });

  it('refuses every call once the ceiling is reached', () => {
    const budget = guard();
    budget.seed(TENANT, DEFAULT_BUDGET_IDR);

    expect(() => budget.reserve(TENANT, 1)).toThrow(/sudah habis/);
  });

  it('allows a call that fits exactly in what is left', () => {
    const budget = guard();
    budget.seed(TENANT, DEFAULT_BUDGET_IDR - 500);

    expect(budget.reserve(TENANT, 500).tier).toBe(MODEL_TIER.FLASH);
  });

  it('attaches the state to the refusal so the UI can explain it', () => {
    const budget = guard();
    budget.seed(TENANT, DEFAULT_BUDGET_IDR);

    try {
      budget.reserve(TENANT, 1);
      expect.unreachable();
    } catch (error) {
      expect(error.state).toMatchObject({ usedPercent: 100, budgetIdr: DEFAULT_BUDGET_IDR });
    }
  });

  it('tracks each tenant against its own budget', () => {
    const budget = guard({ budgets: { 'dealer-arta-motor': 1_000_000 } });
    budget.seed(TENANT, 2_000_000);
    budget.seed('dealer-arta-motor', 950_000);

    expect(budget.stateOf(TENANT).degraded).toBe(false);
    expect(budget.stateOf('dealer-arta-motor').degraded).toBe(true);
  });

  it('starts a fresh budget each month', () => {
    const budget = createBudgetGuard({ now: () => AT });
    budget.seed(TENANT, DEFAULT_BUDGET_IDR, AT);

    const august = new Date('2026-08-01T00:00:00Z');

    expect(budget.stateOf(TENANT, AT).exhausted).toBe(true);
    expect(budget.stateOf(TENANT, august).spentIdr).toBe(0);
    expect(budget.stateOf(TENANT, august).tier).toBe(MODEL_TIER.REASONING);
  });

  it('refuses to answer without a tenant id', () => {
    expect(() => guard().stateOf()).toThrow(TenantScopeError);
    expect(() => guard().record(null, 100)).toThrow(TenantScopeError);
  });

  it('ignores a negative charge rather than crediting the budget', () => {
    const budget = guard();
    budget.seed(TENANT, 100_000);

    budget.record(TENANT, -50_000);

    expect(budget.stateOf(TENANT).spentIdr).toBe(100_000);
  });
});
