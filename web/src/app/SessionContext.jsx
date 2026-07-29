import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { createMemoryTicketStore, seedTickets } from '@lokus/core';

import { createSeededAdminSource } from '../data/adminSource.js';
import { createSeededAgentSource } from '../data/agentSource.js';
import { createSeededBriefingSource } from '../data/briefingSource.js';
import { createSeededReputationSource } from '../data/reputationSource.js';
import { resolveSessionSource } from '../data/sessionSource.js';
import { readActiveTenant, writeActiveTenant } from '../data/tenantCache.js';

const SessionContext = createContext(null);

/**
 * Holds the active tenant and the role that came with it. Selecting a tenant
 * clears every tenant-scoped value the client is holding before writing the
 * new one — constitution IV: no cache is shared across tenants.
 */
export function SessionProvider({
  source,
  reputationSource,
  agentSource,
  briefingSource: injectedBriefing,
  adminSource: injectedAdmin,
  children,
}) {
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

  // One ticket store for the whole console: a ticket raised from a briefing
  // decision and one raised from a chat answer must land on the same board.
  // Rebuilt on a tenant switch like everything else holding tenant data.
  const ticketStore = useMemo(() => {
    const tenantId = tenant?.tenantId ?? 'nusa-retail';
    return createMemoryTicketStore({ seed: seedTickets({ tenantId }) });
  }, [tenant?.tenantId]);

  // Same rule as the reputation source: agent runs hold tenant data, so the
  // whole source is rebuilt on a tenant switch rather than filtered.
  const agent = useMemo(
    () => agentSource ?? createSeededAgentSource({ tenantId: tenant?.tenantId ?? 'nusa-retail', ticketStore }),
    [agentSource, tenant?.tenantId, ticketStore],
  );

  const adminSource = useMemo(
    () => injectedAdmin ?? createSeededAdminSource({ tenantId: tenant?.tenantId ?? 'nusa-retail' }),
    [injectedAdmin, tenant?.tenantId],
  );

  const briefingSource = useMemo(
    () =>
      injectedBriefing ??
      createSeededBriefingSource({ tenantId: tenant?.tenantId ?? 'nusa-retail', ticketStore }),
    [injectedBriefing, tenant?.tenantId, ticketStore],
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
      briefingSource,
      adminSource,
      ticketStore,
      tenant,
      role: tenant?.role ?? null,
      selectTenant,
    }),
    [sessionSource, reputation, agent, briefingSource, adminSource, ticketStore, tenant, selectTenant],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside a SessionProvider');
  return value;
}
