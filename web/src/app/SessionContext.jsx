import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { createMemoryTicketStore, seedTickets } from '@lokus/core';

import { createSeededAdminSource } from '../data/adminSource.js';
import { createSeededAgentSource } from '../data/agentSource.js';
import { createSeededBriefingSource } from '../data/briefingSource.js';
import { createHttpSources } from '../data/httpSources.js';
import { createSeededReputationSource } from '../data/reputationSource.js';
import { createSeededSessionSource } from '../data/sessionSource.js';
import { readActiveTenant, writeActiveTenant } from '../data/tenantCache.js';

const SessionContext = createContext(null);

/**
 * Holds the active tenant and the role that came with it. Selecting a tenant
 * clears every tenant-scoped value the client is holding before writing the
 * new one — constitution IV: no cache is shared across tenants.
 *
 * One decision point for the whole console: with `VITE_LOKUS_API_URL` set,
 * every source is the HTTP one and the browser exercises the API's auth,
 * tenant and RBAC layers for real. Unset, everything runs on the seeded
 * dataset in the browser. Nothing above this file knows which.
 */
export function SessionProvider({
  source,
  reputationSource,
  agentSource,
  briefingSource: injectedBriefing,
  adminSource: injectedAdmin,
  env = import.meta.env,
  children,
}) {
  const [tenant, setTenant] = useState(() => readActiveTenant());

  // The client reads the tenant at request time, so it must see the current
  // one without the sources being rebuilt on every change.
  const tenantRef = useRef(tenant);
  tenantRef.current = tenant;

  const baseUrl = env?.VITE_LOKUS_API_URL?.trim() || null;

  const remote = useMemo(
    () =>
      baseUrl
        ? createHttpSources({
            baseUrl,
            getTenant: () => tenantRef.current,
            user: env?.VITE_LOKUS_DEV_USER || 'demo',
          })
        : null,
    [baseUrl, env?.VITE_LOKUS_DEV_USER],
  );

  const sessionSource = useMemo(
    () => source ?? remote?.session ?? createSeededSessionSource(),
    [source, remote],
  );

  const tenantId = tenant?.tenantId ?? 'nusa-retail';

  // Rebuilt whenever the tenant changes: the seeded sources hold review and
  // draft state, and none of it may survive a tenant switch (constitution IV).
  const reputation = useMemo(
    () => reputationSource ?? remote?.reputation ?? createSeededReputationSource({ tenantId }),
    [reputationSource, remote, tenantId],
  );

  // One ticket store for the whole console: a ticket raised from a briefing
  // decision and one raised from a chat answer must land on the same board.
  const ticketStore = useMemo(
    () => remote?.ticketStore ?? createMemoryTicketStore({ seed: seedTickets({ tenantId }) }),
    [remote, tenantId],
  );

  const agent = useMemo(
    () => agentSource ?? remote?.agent ?? createSeededAgentSource({ tenantId, ticketStore }),
    [agentSource, remote, tenantId, ticketStore],
  );

  const adminSource = useMemo(
    () => injectedAdmin ?? remote?.admin ?? createSeededAdminSource({ tenantId }),
    [injectedAdmin, remote, tenantId],
  );

  const briefingSource = useMemo(
    () => injectedBriefing ?? remote?.briefing ?? createSeededBriefingSource({ tenantId, ticketStore }),
    [injectedBriefing, remote, tenantId, ticketStore],
  );

  const selectTenant = useCallback(
    async (nextTenantId) => {
      const { tenant: selected } = await sessionSource.selectTenant(nextTenantId);
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
      isRemote: Boolean(remote),
      selectTenant,
    }),
    [sessionSource, reputation, agent, briefingSource, adminSource, ticketStore, tenant, remote, selectTenant],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside a SessionProvider');
  return value;
}
