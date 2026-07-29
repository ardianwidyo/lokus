import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { createSeededAgentSource } from '../data/agentSource.js';
import { createSeededReputationSource } from '../data/reputationSource.js';
import { resolveSessionSource } from '../data/sessionSource.js';
import { readActiveTenant, writeActiveTenant } from '../data/tenantCache.js';

const SessionContext = createContext(null);

/**
 * Holds the active tenant and the role that came with it. Selecting a tenant
 * clears every tenant-scoped value the client is holding before writing the
 * new one — constitution IV: no cache is shared across tenants.
 */
export function SessionProvider({ source, reputationSource, agentSource, children }) {
  const sessionSource = useMemo(
    () => source ?? resolveSessionSource(import.meta.env),
    [source],
  );

  const [tenant, setTenant] = useState(() => readActiveTenant());

  // Rebuilt whenever the tenant changes: the reputation source holds review and
  // draft state, and none of it may survive a tenant switch (constitution IV).
  const reputation = useMemo(
    () => reputationSource ?? createSeededReputationSource({ tenantId: tenant?.tenantId ?? 'nusa-retail' }),
    [reputationSource, tenant?.tenantId],
  );

  // Same rule as the reputation source: agent runs hold tenant data, so the
  // whole source is rebuilt on a tenant switch rather than filtered.
  const agent = useMemo(
    () => agentSource ?? createSeededAgentSource({ tenantId: tenant?.tenantId ?? 'nusa-retail' }),
    [agentSource, tenant?.tenantId],
  );

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
      reputation,
      agent,
      tenant,
      role: tenant?.role ?? null,
      selectTenant,
    }),
    [sessionSource, reputation, agent, tenant, selectTenant],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside a SessionProvider');
  return value;
}
