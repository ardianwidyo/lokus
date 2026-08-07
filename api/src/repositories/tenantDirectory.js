import { scopedRows } from '../lib/tenantScope.js';

/**
 * The tenant directory behind one interface, exactly as plan.md prescribes for
 * the external adapters: a seeded implementation now, a Firestore-backed one
 * later, same contract. Copy matches design/SCREENS.md screen 01.
 */

const SEED_TENANTS = Object.freeze([
  {
    tenantId: 'nusa-retail',
    name: 'Nusa Retail',
    segment: 'minimarket',
    outletCount: 42,
    area: 'Jabodetabek',
    plan: 'pilot',
    trialDaysLeft: null,
  },
  {
    tenantId: 'klinik-sehat-prima',
    name: 'Klinik Sehat Prima',
    segment: 'klinik',
    outletCount: 11,
    area: 'Bandung Raya',
    plan: 'pilot',
    trialDaysLeft: null,
  },
  {
    tenantId: 'dealer-arta-motor',
    name: 'Dealer Arta Motor',
    segment: 'otomotif',
    outletCount: 7,
    area: 'Surabaya',
    plan: 'trial',
    trialDaysLeft: 12,
  },
]);

/**
 * Roles the demo account holds per tenant, mirroring web/src/data/sessionSource.js
 * so the seeded console and the API tell the same story. Viewer and admin are
 * both represented because AC-6.3 is only demonstrable if some tenant is not a
 * manager.
 */
const DEMO_ROLES = Object.freeze({
  'nusa-retail': 'admin',
  'klinik-sehat-prima': 'viewer',
  'dealer-arta-motor': 'manager',
});

export function createSeededTenantDirectory({ tenants = SEED_TENANTS, clock = () => new Date() } = {}) {
  const byId = new Map(tenants.map((tenant) => [tenant.tenantId, tenant]));
  /** userId → (tenantId → ISO timestamp) */
  const lastOpened = new Map();

  function get(tenantId) {
    return byId.get(tenantId) ?? null;
  }

  /**
   * Lists only the tenants the token grants. The membership map is the filter,
   * so a tenant the caller has no role for cannot appear even by accident.
   */
  function listForPrincipal(principal) {
    const opened = lastOpened.get(principal.userId) ?? new Map();

    return [...principal.memberships.entries()]
      .map(([tenantId, role]) => {
        const tenant = get(tenantId);
        if (!tenant) return null;
        return { ...tenant, role, lastOpenedAt: opened.get(tenantId) ?? null };
      })
      .filter(Boolean)
      .sort(byLastOpenedThenName);
  }

  function markOpened(principal, tenantId) {
    if (!principal.memberships.has(tenantId)) return null;

    const opened = lastOpened.get(principal.userId) ?? new Map();
    const openedAt = clock().toISOString();
    opened.set(tenantId, openedAt);
    lastOpened.set(principal.userId, opened);
    return openedAt;
  }

  /** Exposed so tenant-scoped reads in later phases share one guard. */
  function rowsFor(tenantId, rows) {
    return scopedRows(tenantId, rows);
  }

  /**
   * The memberships a demo account would carry if Identity Platform were
   * issuing the token — one entry per seeded tenant, with the role that tenant
   * documents. Only `createDevVerifier` reads this, and only for a token that
   * names no tenant; it is what lets screen 01 list anything at all before a
   * tenant has been chosen. The roles differ on purpose, so the RBAC gate is
   * visible in the demo rather than uniformly open.
   */
  function demoMemberships() {
    return new Map(tenants.map((tenant) => [tenant.tenantId, tenant.demoRole ?? DEMO_ROLES[tenant.tenantId]]));
  }

  return { get, listForPrincipal, markOpened, rowsFor, demoMemberships };
}

function byLastOpenedThenName(a, b) {
  if (a.lastOpenedAt && b.lastOpenedAt) return b.lastOpenedAt.localeCompare(a.lastOpenedAt);
  if (a.lastOpenedAt) return -1;
  if (b.lastOpenedAt) return 1;
  return a.name.localeCompare(b.name);
}

export { SEED_TENANTS };
