/**
 * Three roles, ordered. Spec AC-6.3: the role is shown at tenant selection and
 * enforced server-side — the UI hiding a button is a courtesy, not the control.
 */

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer',
});

/** Higher rank implies every capability of the ranks below it. */
const RANK = Object.freeze({
  [ROLES.VIEWER]: 0,
  [ROLES.MANAGER]: 1,
  [ROLES.ADMIN]: 2,
});

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

export function isRole(value) {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RANK, value);
}

/** True when `role` is at least as privileged as `required`. */
export function satisfies(role, required) {
  if (!isRole(role) || !isRole(required)) return false;
  return RANK[role] >= RANK[required];
}

/** Viewers are read-only across every screen. */
export function canWrite(role) {
  return satisfies(role, ROLES.MANAGER);
}
