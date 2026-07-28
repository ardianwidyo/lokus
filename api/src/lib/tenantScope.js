/**
 * Constitution IV: tenant id is part of every query, every document, and every
 * log line. This module is the choke point that makes that mechanical rather
 * than a habit — a repository that forgets the tenant throws instead of
 * returning someone else's rows.
 */

export class TenantScopeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TenantScopeError';
  }
}

function assertTenantId(tenantId) {
  if (typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new TenantScopeError('Query attempted without a tenant id');
  }
  return tenantId;
}

/**
 * Wraps filters with the tenant id. Callers cannot override it: a `tenantId`
 * passed in `filters` is ignored, so a crafted query parameter cannot widen
 * the scope.
 */
export function scopedFilter(tenantId, filters = {}) {
  assertTenantId(tenantId);
  return { ...filters, tenantId };
}

/** Filters an in-memory collection. Rows without a tenant id are never returned. */
export function scopedRows(tenantId, rows) {
  assertTenantId(tenantId);
  return rows.filter((row) => row?.tenantId === tenantId);
}

/**
 * Builds the WHERE clause and parameters for a BigQuery/Firestore query. The
 * tenant predicate is always first and always present.
 */
export function scopedQuery(tenantId, { where = [], params = {} } = {}) {
  assertTenantId(tenantId);
  return {
    where: ['tenant_id = @tenantId', ...where],
    params: { ...params, tenantId },
  };
}

export { assertTenantId };
