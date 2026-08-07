import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { createMemoryTicketStore, seedTickets } from '@lokus/core';

import { useLocale } from '../i18n/index.js';
import { createSeededAdminSource } from '../data/adminSource.js';
import { createSeededAgentSource } from '../data/agentSource.js';
import { createSeededBriefingSource } from '../data/briefingSource.js';
import { createDemoWorkspace } from '../data/demoWorkspace.js';
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

  /**
   * Bumped whenever the seeded data a reader can add to changes.
   *
   * Adding a review or ingesting a SOP mutates state the sources hold caches
   * over — a cached inbox read, a cached reply draft written against the corpus
   * as it was. Rebuilding them is the blunt fix and the right one: the caches
   * exist to make a click feel instant, not to be surgically invalidated. The
   * workspace itself survives, so nothing that was added is lost.
   */
  const [dataVersion, setDataVersion] = useState(0);

  /**
   * Bumped only by a reset, which builds a fresh workspace and so discards
   * every added review and document (AC-10.6). Separate from `dataVersion`
   * because the two mean opposite things: one preserves what was added, the
   * other is the way to throw it away and run the demo again.
   */
  const [workspaceVersion, setWorkspaceVersion] = useState(0);

  // One mutable state for the whole seeded console. Not built at all when the
  // console is talking to an API — the API owns its own.
  const workspace = useMemo(
    () => (remote ? null : createDemoWorkspace({ tenantId })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `workspaceVersion` is the reset signal, not a value read here.
    [remote, tenantId, workspaceVersion],
  );

  // Rebuilt whenever the tenant *or the locale* changes: the seeded sources
  // hold review and draft state, and none of it may survive a tenant switch
  // (constitution IV) — and a source built to answer in one language must not
  // keep doing so once the reader switched away from it.
  const reputation = useMemo(
    () =>
      reputationSource ??
      remote?.reputation ??
      createSeededReputationSource({
        tenantId,
        locale,
        gbp: workspace?.gbp,
        passages: workspace?.passages,
        approvalStore: workspace?.approvalStore,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dataVersion` is the rebuild signal for added reviews and documents, not a value read here.
    [reputationSource, remote, tenantId, locale, workspace, dataVersion],
  );

  // One ticket store for the whole console: a ticket raised from a briefing
  // decision and one raised from a chat answer must land on the same board.
  const ticketStore = useMemo(
    () => remote?.ticketStore ?? createMemoryTicketStore({ seed: seedTickets({ tenantId, locale }) }),
    [remote, tenantId, locale],
  );

  const agent = useMemo(
    () =>
      agentSource ??
      remote?.agent ??
      createSeededAgentSource({
        tenantId,
        ticketStore,
        locale,
        gbp: workspace?.gbp,
        passages: workspace?.passages,
      }),
    [agentSource, remote, tenantId, ticketStore, locale, workspace],
  );

  const adminSource = useMemo(
    () => injectedAdmin ?? remote?.admin ?? createSeededAdminSource({ tenantId, locale, gbp: workspace?.gbp }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dataVersion` is the rebuild signal for added reviews and documents, not a value read here.
    [injectedAdmin, remote, tenantId, locale, workspace, dataVersion],
  );

  const locationSource = useMemo(
    () => injectedLocation ?? remote?.location ?? createSeededLocationSource({ tenantId, locale }),
    [injectedLocation, remote, tenantId, locale],
  );

  const outletSource = useMemo(
    () => injectedOutlet ?? remote?.outlets ?? createSeededOutletSource({ tenantId, locale, gbp: workspace?.gbp }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dataVersion` is the rebuild signal for added reviews and documents, not a value read here.
    [injectedOutlet, remote, tenantId, locale, workspace, dataVersion],
  );

  const knowledgeSource = useMemo(
    () =>
      injectedKnowledge ??
      remote?.knowledge ??
      createSeededKnowledgeSource({ tenantId, locale, store: workspace?.knowledgeStore }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dataVersion` is the rebuild signal for added reviews and documents, not a value read here.
    [injectedKnowledge, remote, tenantId, locale, workspace, dataVersion],
  );

  const briefingSource = useMemo(
    () =>
      injectedBriefing ??
      remote?.briefing ??
      createSeededBriefingSource({ tenantId, ticketStore, locale, gbp: workspace?.gbp }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dataVersion` is the rebuild signal for added reviews and documents, not a value read here.
    [injectedBriefing, remote, tenantId, ticketStore, locale, workspace, dataVersion],
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

  /**
   * Called by a screen after it has added a review or a document, so every
   * other screen stops showing a cached view of the data as it was.
   */
  const dataChanged = useCallback(() => setDataVersion((version) => version + 1), []);

  /**
   * Back to the seeded dataset (AC-10.6). A fresh workspace, so every added
   * review and document is gone — which is the point: the demo has to be
   * runnable a second time, in front of the next judge, from the same state.
   */
  const resetSeededData = useCallback(() => {
    setWorkspaceVersion((version) => version + 1);
    setDataVersion((version) => version + 1);
  }, []);

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
      dataChanged,
      resetSeededData,
      // Screens offer the add-and-reset controls only where they mean
      // something. Against an API the console is not holding the data and
      // cannot throw it away.
      canResetSeededData: Boolean(workspace),
    }),
    [sessionSource, reputation, agent, briefingSource, adminSource, locationSource, outletSource, knowledgeSource, ticketStore, tenant, remote, selectTenant, dataChanged, resetSeededData, workspace],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside a SessionProvider');
  return value;
}
