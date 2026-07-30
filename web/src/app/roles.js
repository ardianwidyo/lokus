/**
 * The same three roles the API enforces (api/src/auth/roles.js). Hiding a
 * button here is a courtesy — the server is what actually refuses (AC-6.3).
 */
export const ROLES = Object.freeze({ ADMIN: 'admin', MANAGER: 'manager', VIEWER: 'viewer' });

/**
 * The dictionary key for a role's display label, from design/SCREENS.md screen
 * 01. The label itself lives in `web/src/i18n`, so a component reads it through
 * `t(roleLabelKey(role))` — a map of labels here would be a second place for
 * "Area Manager" to be written and one of the two would drift.
 */
export function roleLabelKey(role) {
  return `role.${role}`;
}

/** Viewers are read-only, so any action that changes data is hidden from them. */
export function canWrite(role) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}
