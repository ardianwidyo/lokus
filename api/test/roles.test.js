import { describe, expect, it } from 'vitest';

import { ALL_ROLES, ROLES, canWrite, isRole, satisfies } from '../src/auth/roles.js';

describe('roles', () => {
  it('knows exactly three roles', () => {
    expect(ALL_ROLES).toEqual(['admin', 'manager', 'viewer']);
  });

  it.each([
    ['admin', true],
    ['manager', true],
    ['viewer', true],
    ['superuser', false],
    ['', false],
    [null, false],
    [undefined, false],
    [{}, false],
  ])('isRole(%p) === %p', (value, expected) => {
    expect(isRole(value)).toBe(expected);
  });

  it('lets a higher role satisfy a lower requirement', () => {
    expect(satisfies(ROLES.ADMIN, ROLES.MANAGER)).toBe(true);
    expect(satisfies(ROLES.ADMIN, ROLES.VIEWER)).toBe(true);
    expect(satisfies(ROLES.MANAGER, ROLES.VIEWER)).toBe(true);
  });

  it('does not let a lower role satisfy a higher requirement', () => {
    expect(satisfies(ROLES.VIEWER, ROLES.MANAGER)).toBe(false);
    expect(satisfies(ROLES.MANAGER, ROLES.ADMIN)).toBe(false);
  });

  it('treats an unknown role as satisfying nothing', () => {
    expect(satisfies('superuser', ROLES.VIEWER)).toBe(false);
    expect(satisfies(ROLES.ADMIN, 'superuser')).toBe(false);
  });

  it('keeps viewers read-only', () => {
    expect(canWrite(ROLES.VIEWER)).toBe(false);
    expect(canWrite(ROLES.MANAGER)).toBe(true);
    expect(canWrite(ROLES.ADMIN)).toBe(true);
  });
});
