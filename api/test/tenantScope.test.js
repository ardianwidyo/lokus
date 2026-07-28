import { describe, expect, it } from 'vitest';

import { TenantScopeError, scopedFilter, scopedQuery, scopedRows } from '../src/lib/tenantScope.js';

const ROWS = [
  { id: 'r1', tenantId: 'nusa-retail', text: 'antre 25 menit' },
  { id: 'r2', tenantId: 'klinik-sehat-prima', text: 'ruang tunggu penuh' },
  { id: 'r3', tenantId: 'nusa-retail', text: 'stok kosong' },
  { id: 'r4', text: 'row without a tenant' },
];

describe('tenantScope', () => {
  it.each([undefined, null, '', '   ', 42])(
    'refuses to build a query for tenant id %p',
    (tenantId) => {
      expect(() => scopedFilter(tenantId)).toThrow(TenantScopeError);
      expect(() => scopedRows(tenantId, ROWS)).toThrow(TenantScopeError);
      expect(() => scopedQuery(tenantId)).toThrow(TenantScopeError);
    },
  );

  it('returns only rows belonging to the tenant', () => {
    expect(scopedRows('nusa-retail', ROWS).map((row) => row.id)).toEqual(['r1', 'r3']);
  });

  it('never returns a row that carries no tenant id', () => {
    const ids = scopedRows('nusa-retail', ROWS).map((row) => row.id);

    expect(ids).not.toContain('r4');
  });

  it('ignores a tenantId smuggled in through the caller filters', () => {
    // A crafted query parameter must not be able to widen the scope.
    const filter = scopedFilter('nusa-retail', { tenantId: 'klinik-sehat-prima', rating: 1 });

    expect(filter).toEqual({ rating: 1, tenantId: 'nusa-retail' });
  });

  it('always puts the tenant predicate first in a SQL where clause', () => {
    const { where, params } = scopedQuery('nusa-retail', {
      where: ['rating <= @maxRating'],
      params: { maxRating: 2 },
    });

    expect(where[0]).toBe('tenant_id = @tenantId');
    expect(params).toEqual({ maxRating: 2, tenantId: 'nusa-retail' });
  });
});
