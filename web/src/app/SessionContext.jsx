import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { resolveSessionSource } from '../data/sessionSource.js';
import { readActiveTenant, writeActiveTenant } from '../data/tenantCache.js';

const SessionContext = createContext(null);

/**
 * Holds the active tenant and the role that came with it. Selecting a tenant
 * clears every tenant-scoped value the client is holding before writing the
 * new one — constitution IV: no cache is shared across tenants.
 */
export function SessionProvider({ source, children }) {
  const sessionSource = useMemo(
    () => source ?? resolveSessionSource(import.meta.env),
    [source],
  );

  const [tenant, setTenant] = useState(() => readActiveTenant());

  const selectTenant = useCallback(
    async (tenantId) => {
      const { tenant: selected } = await sessionSource.selectTenant(tenantId);
      writeActiveTenant(selected);
      setTenant(selected);
      return selected;
    },
    [sessionSource],
  );

  const value = useMemo(
    () => ({
      source: sessionSource,
      tenant,
      role: tenant?.role ?? null,
      selectTenant,
    }),
    [sessionSource, tenant, selectTenant],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside a SessionProvider');
  return value;
}
