/**
 * Constitution IV, enforced in the domain layer as well as the API layer: a
 * query without a tenant id throws instead of returning rows, and rows that
 * carry no tenant id are never returned.
 *
 * The API has its own copy of this guard at the HTTP boundary
 * (api/src/lib/tenantScope.js). Both exist on purpose: an in-process caller
 * that skips the HTTP layer still cannot read across tenants.
 */
export class TenantScopeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TenantScopeError';
  }
}

export function assertTenant(tenantId) {
  if (typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new TenantScopeError('Query attempted without a tenant id');
  }
  return tenantId;
}

export function scopeToTenant(tenantId, rows) {
  assertTenant(tenantId);
  return rows.filter((row) => row?.tenantId === tenantId);
}
