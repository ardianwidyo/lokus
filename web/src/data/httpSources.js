import { ApiError, createApiClient, createDevTokenProvider } from './apiClient.js';

/**
 * HTTP implementations of every data source, behind the interfaces the seeded
 * ones already satisfy. Nothing above this layer knows which is in use — the
 * screens call the same methods either way.
 *
 * Selected by `VITE_LOKUS_API_URL`. Unset, the console keeps running entirely
 * on the seeded dataset in the browser.
 */
export function createHttpSources({ baseUrl, getTenant, getLocale = null, user = 'demo', fetchImpl = fetch }) {
  const api = createApiClient({
    baseUrl: baseUrl.replace(/\/$/, ''),
    getToken: createDevTokenProvider({ getTenant, user }),
    getTenantId: () => getTenant()?.tenantId ?? null,
    getLocale,
    fetchImpl,
  });

  const session = {
    isSeeded: false,

    async loadSession() {
      const body = await api.get('/v1/session');
      return { user: body.user, tenants: body.tenants };
    },

    async selectTenant(tenantId) {
      // The tenant header must be the one being selected, not the one already
      // held — this call is what changes it.
      const body = await api.post('/v1/session/tenant', null, { tenantId });
      return { tenant: body.tenant };
    },

    // Identity Platform is not provisioned yet (spec.md Q1). These refuse
    // clearly rather than appearing to work and silently doing nothing.
    signInWithGoogle() {
      throw new ApiError('NOT_IMPLEMENTED', 'SSO belum tersambung ke Identity Platform.', 501);
    },

    sendSignInLink() {
      throw new ApiError('NOT_IMPLEMENTED', 'Tautan masuk belum tersambung ke Identity Platform.', 501);
    },
  };

  const reputation = {
    isSeeded: false,
    inbox: ({ bucket = 'perlu-tindakan' } = {}) =>
      api.get(`/v1/reviews?bucket=${encodeURIComponent(bucket)}`),
    reviewDetail: (reviewId) => api.get(`/v1/reviews/${encodeURIComponent(reviewId)}`),
    approveAndSend: ({ reviewId }) =>
      // The approver comes from the token server-side; sending one would be
      // ignored, so the client does not pretend to choose it.
      api.post(`/v1/reviews/${encodeURIComponent(reviewId)}/reply`),
    themeMatrix: () => api.get('/v1/themes'),
    // The demo composer, over HTTP. The tenant is not sent: the server reads it
    // from the token, and a tenant in the body would be a claim the client made
    // about itself.
    addReview: (input) => api.post('/v1/reviews/demo', input).then((body) => body.review),
  };

  const agent = {
    isSeeded: false,
    // Actions come back beside the run on the envelope; they are attached to
    // it here so `actionsFor` has somewhere to read them from.
    ask: async (question) => {
      const body = await api.post('/v1/agent/ask', { question });
      return { ...body.run, actions: body.actions };
    },
    getRun: (id) => api.get(`/v1/runs/${encodeURIComponent(id)}`).then((body) => body.run),
    recentRuns: (limit = 10) => api.get(`/v1/runs?limit=${limit}`).then((body) => body.runs),
    actionsFor: (run) => run?.actions ?? [],
    createTicket: (payload) => api.post('/v1/tickets', payload).then((body) => body.ticket),
  };

  const briefing = {
    isSeeded: false,
    briefing: () => api.get('/v1/briefing'),
    approveDecision: (decision) =>
      api
        .post(`/v1/briefing/decisions/${encodeURIComponent(decision.id)}/approve`)
        .then((body) => body.ticket),
  };

  const location = {
    isSeeded: false,
    networkMap: () => api.get('/v1/map'),
    siteScout: () => api.get('/v1/scout'),
    compareSites: (tenantId, ids) =>
      api.get(ids?.length === 2 ? `/v1/compare?a=${encodeURIComponent(ids[0])}&b=${encodeURIComponent(ids[1])}` : '/v1/compare'),
  };

  const outlets = {
    isSeeded: false,
    list: () => api.get('/v1/outlets').then((body) => body.outlets),
    detail: (tenantId, outletId) => api.get(`/v1/outlets/${encodeURIComponent(outletId)}`),
  };

  const knowledge = {
    isSeeded: false,
    overview: () => api.get('/v1/knowledge'),
    ask: (tenantId, question) => api.post('/v1/knowledge/ask', { question }),
    ingest: (tenantId, document) => api.post('/v1/knowledge/documents', document),
    // No role is sent: the server reads it off the token, and a role in the
    // query string would be a claim the client made about itself.
    document: (tenantId, docId) => api.get(`/v1/knowledge/documents/${encodeURIComponent(docId)}`),
  };

  const admin = {
    isSeeded: false,
    overview: () => api.get('/v1/admin/overview'),
    // Which reasoning paths this process could take. Absent behind a seeded
    // console, which has no process to ask.
    reasoning: () => api.get('/v1/admin/reasoning'),
    selectReasoning: (path) => api.post('/v1/admin/reasoning', { path }),
  };

  /**
   * Matches the shape ActionBoardScreen expects from the ticket store. That
   * screen asks for the board and the stats together, and both live on one
   * response — so concurrent calls share a single in-flight request instead of
   * fetching the same payload twice.
   */
  let inFlight = null;
  const fetchTickets = () => {
    inFlight ??= api.get('/v1/tickets').finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  const ticketStore = {
    board: async () => (await fetchTickets()).board,
    closeTimeStats: async () => (await fetchTickets()).stats,
    list: async () => (await fetchTickets()).board.flatMap((column) => column.tickets),
    create: (tenantId, payload) => api.post('/v1/tickets', payload).then((body) => body.ticket),
  };

  return { session, reputation, agent, briefing, admin, location, outlets, knowledge, ticketStore };
}
