import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/App.jsx';
import { ApiError, createApiClient, createDevTokenProvider, isPermissionError } from '../src/data/apiClient.js';
import { createHttpSources } from '../src/data/httpSources.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const TENANT = { tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role: 'manager' };

/** A fetch double that records what the client sent. */
function stubFetch(handler) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, ...init });
    const result = handler(url, init) ?? { status: 200, body: {} };
    return {
      ok: result.status < 400,
      status: result.status,
      json: async () => result.body,
    };
  };
  return { fetchImpl, calls };
}

const sources = (handler, tenant = TENANT) => {
  const { fetchImpl, calls } = stubFetch(handler);
  return {
    calls,
    ...createHttpSources({ baseUrl: 'https://api.test', getTenant: () => tenant, fetchImpl }),
  };
};

describe('api client', () => {
  it('sends the bearer token and the tenant header on every call', async () => {
    const { reputation, calls } = sources(() => ({ status: 200, body: { rows: [] } }));

    await reputation.themeMatrix();

    expect(calls[0].headers.authorization).toBe('Bearer dev:demo:nusa-retail:manager');
    expect(calls[0].headers['x-lokus-tenant']).toBe('nusa-retail');
  });

  it('sends no token before a tenant is chosen, rather than inventing one', () => {
    const provider = createDevTokenProvider({ getTenant: () => null });

    expect(provider()).toBeNull();
  });

  it('builds a token carrying the role the session actually granted', () => {
    const provider = createDevTokenProvider({ getTenant: () => ({ tenantId: 't', role: 'viewer' }) });

    expect(provider()).toBe('dev:demo:t:viewer');
  });

  it('surfaces the API error code, not a generic failure', async () => {
    const { reputation } = sources(() => ({
      status: 403,
      body: { error: { code: 'TENANT_FORBIDDEN', message: 'No membership' } },
    }));

    await expect(reputation.themeMatrix()).rejects.toMatchObject({
      code: 'TENANT_FORBIDDEN',
      status: 403,
    });
  });

  it('says something useful when the response is not the API at all', async () => {
    // A proxy or a cold start can return HTML; "empty message" would be worse
    // than saying the layer did not answer properly.
    const { reputation } = sources(() => ({ status: 502, body: null }));

    await expect(reputation.themeMatrix()).rejects.toMatchObject({ code: 'HTTP_502' });
  });

  it('classifies permission failures apart from ordinary errors', () => {
    expect(isPermissionError(new ApiError('TENANT_FORBIDDEN', '', 403))).toBe(true);
    expect(isPermissionError(new ApiError('ROLE_FORBIDDEN', '', 403))).toBe(true);
    expect(isPermissionError(new ApiError('INTERNAL', '', 500))).toBe(false);
  });

  it('returns null for a 204 instead of trying to parse a body', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.test',
      getToken: () => 'tok',
      getTenantId: () => 't',
      fetchImpl: async () => ({ ok: true, status: 204, json: async () => { throw new Error('no body'); } }),
    });

    await expect(client.get('/v1/anything')).resolves.toBeNull();
  });
});

describe('http sources', () => {
  it('asks the API for the requested bucket', async () => {
    const { reputation, calls } = sources(() => ({ status: 200, body: { rows: [], counts: {} } }));

    await reputation.inbox({ bucket: 'terkirim' });

    expect(calls[0].url).toBe('https://api.test/v1/reviews?bucket=terkirim');
  });

  it('does not send an approver — the server takes it from the token', async () => {
    const { reputation, calls } = sources(() => ({ status: 200, body: {} }));

    await reputation.approveAndSend({ reviewId: 'rev-1', approvedBy: 'penipu@contoh.id' });

    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toBeUndefined();
  });

  it('attaches the actions from the envelope onto the run', async () => {
    const { agent } = sources(() => ({
      status: 200,
      body: { run: { id: 'run-1', steps: [] }, actions: [{ id: 'create-ticket' }] },
    }));

    const run = await agent.ask('kenapa?');

    expect(agent.actionsFor(run)).toEqual([{ id: 'create-ticket' }]);
  });

  it('fetches the ticket board once when the screen asks for board and stats together', async () => {
    const { ticketStore, calls } = sources(() => ({
      status: 200,
      body: { board: [], stats: { slaDays: 5 } },
    }));

    await Promise.all([ticketStore.board(), ticketStore.closeTimeStats()]);

    expect(calls).toHaveLength(1);
  });

  it('refuses sign-in clearly instead of appearing to work', () => {
    const { session } = sources(() => ({ status: 200, body: {} }));

    expect(() => session.signInWithGoogle()).toThrow(/belum tersambung/);
    expect(() => session.sendSignInLink()).toThrow(/belum tersambung/);
  });

  it('selects a tenant with that tenant in the header, not the one already held', async () => {
    const { session, calls } = sources(() => ({ status: 200, body: { tenant: {} } }));

    await session.selectTenant('dealer-arta-motor');

    expect(calls[0].headers['x-lokus-tenant']).toBe('dealer-arta-motor');
  });
});

describe('the console switches implementation on VITE_LOKUS_API_URL', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('runs on seeded data when the URL is unset', async () => {
    window.history.pushState({}, '', '/masuk');
    render(<App env={{}} />);

    // The seeded source labels itself on screen; nothing silently pretends.
    expect(await screen.findByText('data contoh')).toBeInTheDocument();
  });

  it('calls the API when the URL is set', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ user: { name: 'Dwi' }, tenants: [] }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    window.sessionStorage.setItem(ACTIVE_TENANT_KEY, JSON.stringify(TENANT));
    window.history.pushState({}, '', '/masuk');
    render(<App env={{ VITE_LOKUS_API_URL: 'https://api.test' }} />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.test/v1/session');

    vi.unstubAllGlobals();
  });

  it('ignores a blank URL rather than requesting an empty host', async () => {
    window.history.pushState({}, '', '/masuk');
    render(<App env={{ VITE_LOKUS_API_URL: '   ' }} />);

    expect(await screen.findByText('data contoh')).toBeInTheDocument();
  });
});
