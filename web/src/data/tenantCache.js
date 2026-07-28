/**
 * Constitution IV: "Tenant switching clears client state; there is no shared
 * cache." Every tenant-scoped value the client keeps must live under this
 * prefix, so switching tenants can drop all of it in one place instead of
 * relying on each screen to remember.
 */
export const TENANT_STORAGE_PREFIX = 'lokus:tenant:';
export const ACTIVE_TENANT_KEY = 'lokus:activeTenant';

function storage() {
  try {
    return window.sessionStorage;
  } catch {
    // Private mode or a locked-down browser: no cache is a safe cache.
    return null;
  }
}

export function clearTenantCache() {
  const store = storage();
  if (!store) return;

  for (const key of Object.keys(store)) {
    if (key.startsWith(TENANT_STORAGE_PREFIX) || key === ACTIVE_TENANT_KEY) {
      store.removeItem(key);
    }
  }
}

export function readActiveTenant() {
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(ACTIVE_TENANT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Always clears first: no value from the previous tenant may survive a switch. */
export function writeActiveTenant(tenant) {
  clearTenantCache();

  const store = storage();
  if (!store || !tenant) return;
  store.setItem(ACTIVE_TENANT_KEY, JSON.stringify(tenant));
}
