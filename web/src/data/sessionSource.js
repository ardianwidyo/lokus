/**
 * Session source, behind one interface with two implementations — the pattern
 * plan.md prescribes for every external dependency (Q1):
 *
 *   loadSession()          → { user, tenants[] }
 *   selectTenant(tenantId) → { tenant }
 *   signInWithGoogle()     → { user }
 *   sendSignInLink(email)  → { sentTo }
 *
 * The HTTP implementation talks to the Fastify API. The seeded one serves the
 * fixtures from design/SCREENS.md so the console runs, and demos, before
 * Identity Platform is wired up. Which one is active is visible in the UI —
 * the seeded source reports `isSeeded: true` and the screen says so.
 */

export class SessionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

const SEED_USER = Object.freeze({
  userId: 'user-dwi',
  name: 'Dwi Kurnia',
  email: 'dwi@nusaretail.co.id',
});

/** Copy and figures are verbatim from design/SCREENS.md screen 01. */
const SEED_TENANTS = Object.freeze([
  {
    tenantId: 'nusa-retail',
    name: 'Nusa Retail',
    outletCount: 42,
    segment: 'minimarket',
    area: 'Jabodetabek',
    plan: 'pilot',
    trialDaysLeft: null,
    role: 'admin',
    lastOpenedAt: '2026-07-28T06:00:00+07:00',
  },
  {
    tenantId: 'klinik-sehat-prima',
    name: 'Klinik Sehat Prima',
    outletCount: 11,
    segment: 'klinik',
    area: 'Bandung Raya',
    plan: 'pilot',
    trialDaysLeft: null,
    role: 'viewer',
    lastOpenedAt: null,
  },
  {
    tenantId: 'dealer-arta-motor',
    name: 'Dealer Arta Motor',
    outletCount: 7,
    segment: 'otomotif',
    area: 'Surabaya',
    plan: 'trial',
    trialDaysLeft: 12,
    role: 'manager',
    lastOpenedAt: null,
  },
]);

export function createSeededSessionSource({ tenants = SEED_TENANTS, user = SEED_USER } = {}) {
  let current = tenants.map((tenant) => ({ ...tenant }));

  return {
    isSeeded: true,

    async loadSession() {
      return { user, tenants: current.map((tenant) => ({ ...tenant })) };
    },

    async selectTenant(tenantId) {
      const tenant = current.find((candidate) => candidate.tenantId === tenantId);
      // Same refusal the API gives: a tenant the session does not grant is
      // forbidden, whether or not it exists (AC-6.1).
      if (!tenant) throw new SessionError('TENANT_FORBIDDEN', 'Tenant tidak tersedia untuk akun ini');

      const lastOpenedAt = new Date().toISOString();
      current = current.map((candidate) =>
        candidate.tenantId === tenantId ? { ...candidate, lastOpenedAt } : candidate,
      );
      return { tenant: { ...tenant, lastOpenedAt } };
    },

    async signInWithGoogle() {
      return { user };
    },

    async sendSignInLink(email) {
      return { sentTo: email };
    },
  };
}

export { SEED_TENANTS, SEED_USER };
