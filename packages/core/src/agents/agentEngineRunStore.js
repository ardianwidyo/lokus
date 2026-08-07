import { createMemoryRunStore } from './runStore.js';
import { assertTenant } from '../lib/tenantScope.js';

/**
 * Agent run persistence on Vertex AI Agent Engine Sessions.
 *
 * Constitution III says a run that cannot be explained is a bug. Until now the
 * explanation lived in a `Map` that died with the process — true to the
 * interface, but a trace nobody can fetch tomorrow is a trace that only exists
 * during the demo. This puts the run and its numbered steps in Agent Engine, in
 * `asia-southeast2` with the rest of the stack, and reads them back from there.
 *
 * The mapping, and why each side of it:
 *
 *   run            → Session, `displayName` = run id, `userId` = tenant id
 *   run header     → `sessionState` (question, intent, agents, outcome)
 *   step           → SessionEvent, appended as it happens, `rawEvent` = the step
 *
 * `userId` carries the tenant because `sessions.list` filters on `user_id`
 * server-side — so a cross-tenant read is refused by Google before it is
 * refused by us. We assert it again on the way out anyway: the constitution's
 * rule is that no read crosses tenants, not that we asked nicely.
 *
 * No SDK: one `fetch` per call against a documented REST API, same as the
 * Gemini adapter, and the access token is injected for the same reason —
 * resolving credentials needs Node builtins and this file reaches the browser.
 */

/** Long enough to survive a slow region, short enough not to hold a request. */
export const DEFAULT_TIMEOUT_MS = 10_000;

export class AgentEngineError extends Error {
  constructor(code, message, { status = null } = {}) {
    super(message);
    this.name = 'AgentEngineError';
    this.code = code;
    this.status = status;
  }
}

export function createAgentEngineRunStore({
  // `projects/{p}/locations/{l}/reasoningEngines/{id}` — the engine holds the
  // sessions; it runs no code of ours (see plan.md, 2026-08-07).
  engine = null,
  location = 'asia-southeast2',
  getAccessToken = null,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  // Every write also lands here, and every read falls back to it. A trace store
  // that is down must not take the answer down with it, and must not quietly
  // lose the trace either — constitution III is about being able to explain the
  // run, and "the network blipped" is not an explanation.
  mirror = createMemoryRunStore(),
  onError = null,
} = {}) {
  if (!engine) {
    throw new AgentEngineError('AGENT_ENGINE_NOT_CONFIGURED', 'Resource reasoningEngine belum diset.');
  }
  if (typeof getAccessToken !== 'function') {
    throw new AgentEngineError('AGENT_ENGINE_NOT_CONFIGURED', 'Penyedia access token belum diberikan.');
  }

  const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
  const base = `https://${host}/v1/${engine}`;

  /** Run id → session resource name, so a read does not re-search every time. */
  const sessionNames = new Map();
  /** Appends in flight, awaited at `finish` — see `appendStep`. */
  const pending = new Map();

  let degraded = false;

  async function call(path, { method = 'GET', body = null } = {}) {
    const token = await getAccessToken();
    if (!token) throw new AgentEngineError('AGENT_ENGINE_NO_CREDENTIALS', 'Kredensial Google kosong.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        method,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      throw new AgentEngineError(
        error?.name === 'AbortError' ? 'AGENT_ENGINE_TIMEOUT' : 'AGENT_ENGINE_UNREACHABLE',
        `Agent Engine tidak menjawab: ${error?.message ?? 'sebab tidak diketahui'}`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // Collapsed and generous: Google's reason for a 400 here is a sentence
      // that names the fix, and the first version of this cut it in half.
      const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ');
      throw new AgentEngineError(
        'AGENT_ENGINE_HTTP_ERROR',
        `Agent Engine menolak (${response.status}). ${detail.slice(0, 400)}`,
        { status: response.status },
      );
    }

    return response.json();
  }

  /**
   * Runs `work`, and on any failure keeps going on the mirror instead of
   * failing the caller. The error is reported once per call rather than
   * swallowed — a degraded trace store should be visible in the logs, not
   * discovered when someone asks why screen 13 is thin.
   */
  async function tolerate(operation, work, fallback) {
    try {
      const result = await work();
      degraded = false;
      return result;
    } catch (error) {
      degraded = true;
      onError?.({ operation, code: error?.code ?? 'AGENT_ENGINE_FAILED', message: error?.message });
      return fallback();
    }
  }

  /**
   * A create returns an LRO whose name already contains the session. Reading
   * `response.name` when it is there and deriving it when it is not means one
   * round trip either way — polling an operation that is already `done` would
   * only add latency to every question a manager asks.
   */
  function sessionNameFrom(operation) {
    const fromResponse = operation?.response?.name;
    if (fromResponse) return fromResponse;
    const name = operation?.name ?? '';
    const cut = name.indexOf('/operations/');
    return cut > 0 ? name.slice(0, cut) : null;
  }

  async function findSession(tenantId, runId) {
    if (sessionNames.has(runId)) return sessionNames.get(runId);

    const query = new URLSearchParams({
      filter: `user_id="${tenantId}" AND display_name="${runId}"`,
      pageSize: '10',
    });
    const body = await call(`/sessions?${query}`);
    // Run ids are unique per process, not per project, so a restart can mint a
    // id that was used before. The newest wins: an older run with the same id
    // is a different run, and the one just written is the one being asked for.
    const newest = (body.sessions ?? [])
      .slice()
      .sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)))[0];

    if (newest) sessionNames.set(runId, newest.name);
    return newest?.name ?? null;
  }

  function runFrom(session, steps) {
    const state = session.sessionState ?? {};
    return { ...state, steps, id: state.id ?? session.displayName, tenantId: state.tenantId ?? session.userId };
  }

  return {
    kind: 'agent-engine',
    engine,
    location,
    /** True after a call fell back to the mirror; screen 14 can say so. */
    get degraded() {
      return degraded;
    },

    async start(tenantId, header) {
      assertTenant(tenantId);
      const run = await mirror.start(tenantId, header);

      await tolerate(
        'start',
        async () => {
          const operation = await call('/sessions', {
            method: 'POST',
            body: {
              userId: tenantId,
              displayName: header.id,
              sessionState: { ...run, steps: undefined },
            },
          });
          const name = sessionNameFrom(operation);
          if (name) sessionNames.set(header.id, name);
          return name;
        },
        () => null,
      );

      return run;
    },

    /**
     * Fires the append immediately and tracks the promise rather than awaiting
     * it. Awaiting each one in turn would put a round trip to Jakarta between
     * every step of every answer; buffering them until the end would lose
     * exactly the steps a crashed run did complete, which is the case the
     * append-as-it-happens rule exists for. Started now, awaited at `finish`.
     */
    async appendStep(tenantId, id, step) {
      assertTenant(tenantId);
      const stored = await mirror.appendStep(tenantId, id, step);
      const session = sessionNames.get(id);
      if (!session) return stored;

      const inFlight = tolerate(
        'appendStep',
        () =>
          call(`/sessions/${session.split('/sessions/')[1]}:appendEvent`, {
            method: 'POST',
            body: {
              author: step.agent ?? step.tool ?? 'supervisor',
              invocationId: id,
              timestamp: new Date().toISOString(),
              // The structured step, unflattened: screen 13 renders these
              // fields, so the trace has to survive the round trip intact.
              rawEvent: step,
              content: { role: 'model', parts: [{ text: describe(step) }] },
            },
          }),
        () => null,
      );

      pending.set(id, [...(pending.get(id) ?? []), inFlight]);
      return stored;
    },

    async finish(tenantId, id, outcome) {
      assertTenant(tenantId);
      const run = await mirror.finish(tenantId, id, outcome);

      // Every step must be on the wire before the header claims the run is
      // done, or a reader can fetch a finished run that is missing its middle.
      await Promise.all(pending.get(id) ?? []);
      pending.delete(id);

      const session = sessionNames.get(id);
      if (session && run) {
        await tolerate(
          'finish',
          () =>
            // Not a PATCH. Agent Engine refuses one outright — "you can only
            // update it by appending an event" — because session state is
            // derived from the event log rather than overwritten on top of it.
            // That is the same rule constitution III already imposes on us: the
            // outcome is another entry in the record, not an edit to it.
            call(`/sessions/${session.split('/sessions/')[1]}:appendEvent`, {
              method: 'POST',
              body: {
                author: 'supervisor',
                invocationId: id,
                timestamp: new Date().toISOString(),
                actions: {
                  stateDelta: {
                    ...run,
                    steps: undefined,
                    // Counted here so listing runs costs one call rather than
                    // one per run: a list shows how many steps, not what they
                    // were.
                    stepCount: run.steps?.length ?? 0,
                  },
                },
                content: { role: 'model', parts: [{ text: `selesai · ${run.status}` }] },
              },
            }),
          () => null,
        );
      }

      return run;
    },

    async get(tenantId, id) {
      assertTenant(tenantId);

      return tolerate(
        'get',
        async () => {
          const session = await findSession(tenantId, id);
          if (!session) return mirror.get(tenantId, id);

          const detail = await call(`/sessions/${session.split('/sessions/')[1]}`);
          // Belt and braces: Google filtered on user_id, and we check the
          // answer anyway. A run belonging to another tenant is invisible.
          if (detail.userId !== tenantId) return null;

          const events = await call(`/sessions/${session.split('/sessions/')[1]}/events`);
          const steps = (events.sessionEvents ?? [])
            .map((event) => event.rawEvent)
            .filter(Boolean)
            .sort((a, b) => (a.n ?? 0) - (b.n ?? 0));

          return runFrom(detail, steps);
        },
        () => mirror.get(tenantId, id),
      );
    },

    async list(tenantId, { limit = 20 } = {}) {
      assertTenant(tenantId);

      return tolerate(
        'list',
        async () => {
          const query = new URLSearchParams({
            filter: `user_id="${tenantId}"`,
            pageSize: String(Math.min(limit, 100)),
          });
          const body = await call(`/sessions?${query}`);

          return (body.sessions ?? [])
            .filter((session) => session.userId === tenantId)
            .sort((a, b) => String(b.createTime).localeCompare(String(a.createTime)))
            .slice(0, limit)
            // Steps are not fetched here. A list shows a step *count*, and
            // pulling every event of every run to count them is one request per
            // row — the count is recorded on the run at `finish` instead.
            .map((session) => runFrom(session, []));
        },
        () => mirror.list(tenantId, { limit }),
      );
    },
  };
}

/** The one-line form a human reads in the Agent Engine console. */
function describe(step) {
  const parts = [step.tool ?? step.agent ?? 'step'];
  if (step.summary) parts.push(step.summary);
  else if (step.model) parts.push(step.model);
  if (typeof step.ms === 'number') parts.push(`${step.ms} ms`);
  return parts.join(' · ');
}
