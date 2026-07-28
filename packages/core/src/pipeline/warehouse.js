import { assertTenant, scopeToTenant } from '../lib/tenantScope.js';

/**
 * The warehouse behind one interface, so the nightly load runs identically
 * against BigQuery in production and against memory in tests and in the seeded
 * demo. The SQL those two mirror lives in `infra/sql/`.
 *
 *   putLanding(tenantId, extractedAt, payload)
 *   mergeReviews(tenantId, rows)   -> { inserted, updated }
 *   listReviews(tenantId, filter)
 *   replaceThemeRollup(tenantId, rows)
 *   listThemeRollup(tenantId)
 *
 * Every method takes a tenant id first and refuses without one — the same
 * guard the SQL applies with its `WHERE tenant_id = @tenantId` predicate.
 */
export function createMemoryWarehouse() {
  const landing = [];
  const reviews = new Map(); // `${tenantId}:${id}` -> row
  const rollups = [];

  function key(tenantId, id) {
    return `${tenantId}:${id}`;
  }

  return {
    kind: 'memory',

    async putLanding(tenantId, extractedAt, payload) {
      assertTenant(tenantId);
      landing.push({ tenantId, extractedAt, payload });
      return { rows: 1 };
    },

    /** MERGE semantics: an edited or replied-to review updates, never duplicates. */
    async mergeReviews(tenantId, rows) {
      assertTenant(tenantId);
      let inserted = 0;
      let updated = 0;

      for (const row of rows) {
        if (row.tenantId !== tenantId) {
          // A source bug must not be able to write into another tenant.
          throw new Error(`Row ${row.id} does not belong to tenant ${tenantId}`);
        }

        const id = key(tenantId, row.id);
        const existing = reviews.get(id);
        if (existing) {
          // Themes are owned by the clustering step and survive a reload.
          reviews.set(id, { ...existing, ...row, themes: existing.themes ?? [] });
          updated += 1;
        } else {
          reviews.set(id, { ...row, themes: [] });
          inserted += 1;
        }
      }

      return { inserted, updated };
    },

    async listReviews(tenantId, { outletId = null, since = null, maxRating = null } = {}) {
      assertTenant(tenantId);
      let rows = scopeToTenant(tenantId, [...reviews.values()]);
      if (outletId) rows = rows.filter((row) => row.outletId === outletId);
      if (since) rows = rows.filter((row) => row.publishedAt >= new Date(since).toISOString());
      if (maxRating !== null) rows = rows.filter((row) => row.rating <= maxRating);
      return rows;
    },

    async setThemes(tenantId, reviewId, themes) {
      assertTenant(tenantId);
      const row = reviews.get(key(tenantId, reviewId));
      if (!row) return false;
      row.themes = themes;
      return true;
    },

    async replaceThemeRollup(tenantId, rows) {
      assertTenant(tenantId);
      for (let i = rollups.length - 1; i >= 0; i -= 1) {
        if (rollups[i].tenantId === tenantId) rollups.splice(i, 1);
      }
      rollups.push(...rows.map((row) => ({ ...row, tenantId })));
      return { rows: rows.length };
    },

    async listThemeRollup(tenantId) {
      assertTenant(tenantId);
      return scopeToTenant(tenantId, rollups);
    },

    async landingCount(tenantId) {
      assertTenant(tenantId);
      return landing.filter((row) => row.tenantId === tenantId).length;
    },
  };
}
