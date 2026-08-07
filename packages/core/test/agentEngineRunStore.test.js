import { describe, expect, it, vi } from 'vitest';

import {
  AgentEngineError,
  createAgentEngineRunStore,
} from '../src/agents/agentEngineRunStore.js';

const ENGINE = 'projects/ebco-aihack-ardian/locations/asia-southeast2/reasoningEngines/7434704112974823424';
const SESSION = `${ENGINE}/sessions/900`;
const TENANT = 'nusa-retail';

const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => '' });

/**
 * A fake Agent Engine that behaves the way the real one does — including
 * refusing a state PATCH, which is the constraint that shaped `finish`.
 */
function fakeEngine({ sessions = [], events = [] } = {}) {
  const calls = [];

  const fetchImpl = vi.fn(async (url, init = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : null });

    if (init.method === 'PATCH') {
      return {
        ok: false,
        status: 400,
        text: async () => "Can't update the session state, you can only update it by appending an event.",
      };
    }
    if (url.includes(':appendEvent')) return ok({});
    if (url.includes('/events')) return ok({ sessionEvents: events });
    if (init.method === 'POST') return ok({ name: `${SESSION}/operations/1`, done: true });
    if (url.includes('/sessions?')) return ok({ sessions });
    return ok(sessions[0] ?? {});
  });

  return { fetchImpl, calls };
}

const storeWith = (fake, extra = {}) =>
  createAgentEngineRunStore({
    engine: ENGINE,
    getAccessToken: async () => 'ya29.token',
    fetchImpl: fake.fetchImpl,
    ...extra,
  });

const HEADER = { id: 'run-a', question: 'kenapa turun?', intent: 'diagnose', agents: ['reputation'], startedAt: '2026-08-07T09:00:00Z' };

describe('agent runs on Agent Engine Sessions', () => {
  it('refuses to construct without an engine or a token source', () => {
    expect(() => createAgentEngineRunStore({})).toThrow(AgentEngineError);
    expect(() => createAgentEngineRunStore({ engine: ENGINE })).toThrow(/access token/);
  });

  it('opens a session per run, carrying the tenant as the user id', async () => {
    // sessions.list filters on user_id server-side, so the tenant has to be
    // there — otherwise isolation is only ever our own promise.
    const fake = fakeEngine();
    await storeWith(fake).start(TENANT, HEADER);

    const create = fake.calls.find((call) => call.method === 'POST');
    expect(create.url).toContain('asia-southeast2-aiplatform.googleapis.com');
    expect(create.body.userId).toBe(TENANT);
    expect(create.body.displayName).toBe('run-a');
    expect(create.body.sessionState.question).toBe('kenapa turun?');
  });

  it('appends each step as its own event, structured', async () => {
    const fake = fakeEngine();
    const store = storeWith(fake);

    await store.start(TENANT, HEADER);
    await store.appendStep(TENANT, 'run-a', { n: 1, tool: 'gbp.listReviews', ms: 12 });
    await store.finish(TENANT, 'run-a', { refused: false, latencyMs: 30 });

    const appended = fake.calls.filter((call) => call.url.includes(':appendEvent'));
    // Screen 13 renders these fields, so the step has to survive intact.
    expect(appended[0].body.rawEvent).toEqual({ n: 1, tool: 'gbp.listReviews', ms: 12 });
    expect(appended[0].body.author).toBe('gbp.listReviews');
    expect(appended[0].body.invocationId).toBe('run-a');
  });

  it('records the outcome by appending, because Agent Engine refuses a patch', async () => {
    // "You can only update it by appending an event" — the API's own words. The
    // outcome is another entry in the record, not an edit to it.
    const fake = fakeEngine();
    const store = storeWith(fake);

    await store.start(TENANT, HEADER);
    await store.appendStep(TENANT, 'run-a', { n: 1, tool: 'x' });
    await store.finish(TENANT, 'run-a', { refused: false, latencyMs: 30 });

    expect(fake.calls.some((call) => call.method === 'PATCH')).toBe(false);

    const outcome = fake.calls.filter((c) => c.url.includes(':appendEvent')).at(-1);
    expect(outcome.body.actions.stateDelta).toMatchObject({ status: 'ok', latencyMs: 30, stepCount: 1 });
    expect(outcome.body.actions.stateDelta.steps).toBeUndefined();
  });

  it('waits for every step to be on the wire before calling the run finished', async () => {
    // A reader must never fetch a finished run that is missing its middle.
    let settled = 0;
    const fake = fakeEngine();
    const slow = vi.fn(async (url, init) => {
      const response = await fake.fetchImpl(url, init);
      if (url.includes(':appendEvent')) settled += 1;
      return response;
    });
    const store = storeWith(fake, { fetchImpl: slow });

    await store.start(TENANT, HEADER);
    await store.appendStep(TENANT, 'run-a', { n: 1, tool: 'a' });
    await store.appendStep(TENANT, 'run-a', { n: 2, tool: 'b' });
    await store.finish(TENANT, 'run-a', { refused: false });

    expect(settled).toBe(3); // two steps and the outcome
  });

  it('rebuilds a run from its session state and its events, in step order', async () => {
    const fake = fakeEngine({
      sessions: [{ name: SESSION, userId: TENANT, displayName: 'run-a', createTime: '2026-08-07T09:00:00Z', sessionState: { id: 'run-a', tenantId: TENANT, status: 'ok', question: 'kenapa turun?' } }],
      // Deliberately out of order: events come back by write time, and two
      // steps that finished in the same millisecond must still read 1 then 2.
      events: [{ rawEvent: { n: 2, tool: 'b' } }, { rawEvent: { n: 1, tool: 'a' } }],
    });

    const run = await storeWith(fake).get(TENANT, 'run-a');

    expect(run.status).toBe('ok');
    expect(run.steps.map((step) => step.n)).toEqual([1, 2]);
  });

  it('makes another tenant run invisible even if the API hands one back', async () => {
    // Google filtered on user_id; we check the answer anyway.
    const fake = fakeEngine({
      sessions: [{ name: SESSION, userId: 'klinik-sehat', displayName: 'run-a', createTime: '2026-08-07T09:00:00Z', sessionState: {} }],
    });

    expect(await storeWith(fake).get(TENANT, 'run-a')).toBeNull();
  });

  it('lists runs without fetching a single event', async () => {
    // A list shows how many steps, not what they were. Counting them by
    // fetching would be one request per row.
    const fake = fakeEngine({
      sessions: [
        { name: SESSION, userId: TENANT, displayName: 'run-a', createTime: '2026-08-07T09:00:00Z', sessionState: { id: 'run-a', status: 'ok', stepCount: 8 } },
      ],
    });

    const runs = await storeWith(fake).list(TENANT, { limit: 5 });

    expect(runs[0].stepCount).toBe(8);
    expect(fake.calls.some((call) => call.url.includes('/events'))).toBe(false);
    expect(fake.calls[0].url).toContain(encodeURIComponent(`user_id="${TENANT}"`));
  });

  it('keeps answering from memory when Agent Engine is unreachable, and says so', async () => {
    // The trace store being down must not take the answer down with it — and
    // must not lose the trace in silence either.
    const onError = vi.fn();
    const store = createAgentEngineRunStore({
      engine: ENGINE,
      getAccessToken: async () => 'ya29.token',
      fetchImpl: async () => {
        throw new Error('getaddrinfo ENOTFOUND');
      },
      onError,
    });

    await store.start(TENANT, HEADER);
    await store.appendStep(TENANT, 'run-a', { n: 1, tool: 'a' });
    await store.finish(TENANT, 'run-a', { refused: false, latencyMs: 5 });

    const run = await store.get(TENANT, 'run-a');
    expect(run.steps).toHaveLength(1);
    expect(run.status).toBe('ok');
    expect(store.degraded).toBe(true);
    expect(onError.mock.calls[0][0]).toMatchObject({ operation: 'start', code: 'AGENT_ENGINE_UNREACHABLE' });
  });

  it('reports enough of Google refusal to act on it', async () => {
    // The first version cut the body at 200 characters and lost the half of
    // the sentence that named the fix.
    const onError = vi.fn();
    const store = createAgentEngineRunStore({
      engine: ENGINE,
      getAccessToken: async () => 'ya29.token',
      fetchImpl: async () => ({
        ok: false,
        status: 400,
        text: async () => `${'x'.repeat(150)} you can only update it by appending an event.`,
      }),
      onError,
    });

    await store.start(TENANT, HEADER);

    expect(onError.mock.calls[0][0].message).toContain('appending an event');
  });
});
