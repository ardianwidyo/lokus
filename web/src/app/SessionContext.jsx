import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { createMemoryTicketStore, seedTickets } from '@lokus/core';

import { useLocale } from '../i18n/index.js';
import { createSeededAdminSource } from '../data/adminSource.js';
import { createSeededAgentSource } from '../data/agentSource.js';
import { createSeededBriefingSource } from '../data/briefingSource.js';
import { createHttpSources } from '../data/httpSources.js';
import { createSeededKnowledgeSource } from '../data/knowledgeSource.js';
import { createSeededLocationSource } from '../data/locationSource.js';
import { createSeededOutletSource } from '../data/outletSource.js';
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
 *
 * Since US-8 there is a second decision point riding along the first: every
 * seeded source is rebuilt when the reader's language changes, the same way it
 * is rebuilt when the tenant changes. A seeded source closes over `locale` for
 * every domain call it makes, so a source built for Indonesian would otherwise
 * keep answering in Indonesian after the reader switched to English. The HTTP
 * client instead sends the locale as a header on every request — rebuilding it
 * would drop the in-flight ticket dedupe in `httpSources.js` for no reason, and
 * the API already reads the header per request rather than per connection.
 */
export function SessionProvider({
  source,
  reputationSource,
  agentSource,
  briefingSource: injectedBriefing,
  adminSource: injectedAdmin,
  locationSource: injectedLocation,
  outletSource: injectedOutlet,
  knowledgeSource: injectedKnowledge,
  env = import.meta.env,
  children,
}) {
  const { locale } = useLocale();
  const [tenant, setTenant] = useState(() => readActiveTenant());

  // The client reads the tenant at request time, so it must see the current
  // one without the sources being rebuilt on every change. Locale rides the
  // same ref for the same reason: the HTTP client is long-lived and reads
  // `localeRef.current` fresh on every request rather than being rebuilt.
  const tenantRef = useRef(tenant);
  tenantRef.current = tenant;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const baseUrl = env?.VITE_LOKUS_API_URL?.trim() || null;

  const remote = useMemo(
    () =>
      baseUrl
        ? createHttpSources({
            baseUrl,
            getTenant: () => tenantRef.current,
            getLocale: () => localeRef.current,
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

  // Rebuilt whenever the tenant *or the locale* changes: the seeded sources
  // hold review and draft state, and none of it may survive a tenant switch
  // (constitution IV) — and a source built to answer in one language must not
  // keep doing so once the reader switched away from it.
  const reputation = useMemo(
    () => reputationSource ?? remote?.reputation ?? createSeededReputationSource({ tenantId, locale }),
    [reputationSource, remote, tenantId, locale],
  );

  // One ticket store for the whole console: a ticket raised from a briefing
  // decision and one raised from a chat answer must land on the same board.
  const ticketStore = useMemo(
    () => remote?.ticketStore ?? createMemoryTicketStore({ seed: seedTickets({ tenantId, locale }) }),
    [remote, tenantId, locale],
  );

  const agent = useMemo(
    () => agentSource ?? remote?.agent ?? createSeededAgentSource({ tenantId, ticketStore, locale }),
    [agentSource, remote, tenantId, ticketStore, locale],
  );

  const adminSource = useMemo(
    () => injectedAdmin ?? remote?.admin ?? createSeededAdminSource({ tenantId, locale }),
    [injectedAdmin, remote, tenantId, locale],
  );

  const locationSource = useMemo(
    () => injectedLocation ?? remote?.location ?? createSeededLocationSource({ tenantId, locale }),
    [injectedLocation, remote, tenantId, locale],
  );

  const outletSource = useMemo(
    () => injectedOutlet ?? remote?.outlets ?? createSeededOutletSource({ tenantId, locale }),
    [injectedOutlet, remote, tenantId, locale],
  );

  const knowledgeSource = useMemo(
    () => injectedKnowledge ?? remote?.knowledge ?? createSeededKnowledgeSource({ tenantId, locale }),
    [injectedKnowledge, remote, tenantId, locale],
  );

  const briefingSource = useMemo(
    () =>
      injectedBriefing ?? remote?.briefing ?? createSeededBriefingSource({ tenantId, ticketStore, locale }),
    [injectedBriefing, remote, tenantId, ticketStore, locale],
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
      locationSource,
      outletSource,
      knowledgeSource,
      ticketStore,
      tenant,
      role: tenant?.role ?? null,
      isRemote: Boolean(remote),
      selectTenant,
    }),
    [sessionSource, reputation, agent, briefingSource, adminSource, locationSource, outletSource, knowledgeSource, ticketStore, tenant, remote, selectTenant],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside a SessionProvider');
  return value;
}
