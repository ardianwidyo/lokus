/**
 * The same three roles the API enforces (api/src/auth/roles.js). Hiding a
 * button here is a courtesy — the server is what actually refuses (AC-6.3).
 */
export const ROLES = Object.freeze({ ADMIN: 'admin', MANAGER: 'manager', VIEWER: 'viewer' });

/** Display labels, from design/SCREENS.md screen 01. */
export const ROLE_LABELS = Object.freeze({
  admin: 'Admin',
  manager: 'Area Manager',
  viewer: 'Viewer',
});

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}

/** Viewers are read-only, so any action that changes data is hidden from them. */
export function canWrite(role) {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}
