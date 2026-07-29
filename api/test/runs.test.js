import { createMemoryRunStore, createSupervisor, createUnavailableAgent, withRunPersistence } from '@lokus/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ROLES } from '../src/auth/roles.js';
import { buildServer } from '../src/server.js';
import { TEST_AUTH_CONFIG, TEST_PROJECT_ID, createTestIssuer } from './helpers/tokens.js';

const TENANT = 'nusa-retail';
const CONFIG = {
  environment: 'test',
  region: 'asia-southeast2',
  projectId: TEST_PROJECT_ID,
  auth: TEST_AUTH_CONFIG,
};

/** A tiny agent so these tests exercise persistence, not the domain logic. */
const stubAgent = (name) => ({
  name,
  async run({ startStep }) {
    return {
      agent: name,
      findings: [{ agent: name, text: 'Antrean kasir naik pekan ini.', sourceCount: 1 }],
      sources: [{ type: 'review', id: 'rev-1', outletId: 'BKS-02' }],
      steps: [{ n: startStep, tool: `${name}.work`, resultSize: 1, ms: 3 }],
      nextStep: startStep + 1,
    };
  },
});

describe('GET /v1/runs (AC-7.2)', () => {
  let issuer;
  let fastify;
  let runStore;
  let supervisor;

  beforeEach(async () => {
    issuer = await createTestIssuer();
    runStore = createMemoryRunStore();
    supervisor = withRunPersistence(
      createSupervisor({
        agents: {
          reputation: stubAgent('reputation'),
          knowledge: stubAgent('knowledge'),
          location: createUnavailableAgent('location', 'Agen Lokasi', 'Belum aktif.'),
        },
      }),
      runStore,
    );

    fastify = buildServer({
      config: CONFIG,
      verifyIdToken: issuer.verify,
      runStore,
      logger: false,
    });
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  const call = (url, token, tenantId = TENANT) =>
    fastify.inject({
      method: 'GET',
      url,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { 'x-lokus-tenant': tenantId } : {}),
      },
    });

  it('returns the full trace of a persisted run', async () => {
    const run = await supervisor.ask({ tenantId: TENANT, question: 'Kenapa rating Bekasi turun?' });
    const token = await issuer.sign({ roles: { [TENANT]: ROLES.VIEWER } });

    const response = await call(`/v1/runs/${run.id}`, token);
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.run.id).toBe(run.id);
    expect(body.run.steps.length).toBe(run.steps.length);
    expect(body.run.steps[0]).toMatchObject({
      n: 1,
      tool: 'supervisor.route',
      resultSize: expect.any(Number),
      ms: expect.any(Number),
    });
  });

  it('persists the answer, cost and latency alongside the steps (AC-7.4)', async () => {
    const run = await supervisor.ask({ tenantId: TENANT, question: 'Kenapa rating Bekasi turun?' });
    const token = await issuer.sign({ roles: { [TENANT]: ROLES.VIEWER } });

    const { run: stored } = (await call(`/v1/runs/${run.id}`, token)).json();

    expect(stored.answer).toBe(run.answer);
    expect(stored.costIdr).toBe(run.costIdr);
    expect(stored.latencyMs).toBe(run.latencyMs);
    expect(stored.status).toBe('ok');
  });

  it('marks a refused run as refused rather than dropping it', async () => {
    const empty = withRunPersistence(createSupervisor({ agents: {} }), runStore);
    const run = await empty.ask({ tenantId: TENANT, question: 'pertanyaan tanpa agen' });
    const token = await issuer.sign({ roles: { [TENANT]: ROLES.VIEWER } });

    const { run: stored } = (await call(`/v1/runs/${run.id}`, token)).json();

    expect(stored.status).toBe('refused');
    expect(stored.steps.length).toBeGreaterThan(0);
  });

  it('lists recent runs for the tenant', async () => {
    await supervisor.ask({ tenantId: TENANT, question: 'pertanyaan satu' });
    await supervisor.ask({ tenantId: TENANT, question: 'pertanyaan dua' });
    const token = await issuer.sign({ roles: { [TENANT]: ROLES.VIEWER } });

    const body = (await call('/v1/runs', token)).json();

    expect(body.runs).toHaveLength(2);
    expect(body.runs[0]).toMatchObject({ stepCount: expect.any(Number), costIdr: expect.any(Number) });
  });

  it('hides another tenant\'s run behind the same 404 as a missing one (AC-6.1)', async () => {
    const run = await supervisor.ask({ tenantId: TENANT, question: 'rahasia tenant lain' });
    const token = await issuer.sign({ roles: { 'dealer-arta-motor': ROLES.ADMIN } });

    const foreign = await call(`/v1/runs/${run.id}`, token, 'dealer-arta-motor');
    const missing = await call('/v1/runs/run-tidak-ada', token, 'dealer-arta-motor');

    expect(foreign.statusCode).toBe(404);
    expect(missing.statusCode).toBe(404);
    expect(foreign.json()).toEqual(missing.json());
  });

  it('requires a token and a tenant', async () => {
    const token = await issuer.sign({ roles: { [TENANT]: ROLES.VIEWER } });

    expect((await call('/v1/runs', null)).statusCode).toBe(401);
    expect((await call('/v1/runs', token, null)).statusCode).toBe(400);
  });

  it('caps the list size however large a limit is asked for', async () => {
    await supervisor.ask({ tenantId: TENANT, question: 'satu' });
    const token = await issuer.sign({ roles: { [TENANT]: ROLES.VIEWER } });

    const body = (await call('/v1/runs?limit=9999', token)).json();

    expect(body.runs.length).toBeLessThanOrEqual(100);
  });
});

describe('run store', () => {
  it('keeps steps written before a run finished', async () => {
    const store = createMemoryRunStore();
    await store.start(TENANT, { id: 'r1', question: 'q', intent: 'lain', agents: [], startedAt: 'now' });
    await store.appendStep(TENANT, 'r1', { n: 1, tool: 'supervisor.route', resultSize: 0, ms: 0 });

    // Never finished: a crashed run must still leave its trace behind.
    const stored = await store.get(TENANT, 'r1');

    expect(stored.status).toBe('running');
    expect(stored.steps).toHaveLength(1);
  });

  it('returns a copy, so a caller cannot mutate the stored trace', async () => {
    const store = createMemoryRunStore();
    await store.start(TENANT, { id: 'r1', question: 'q', intent: 'lain', agents: [], startedAt: 'now' });

    const first = await store.get(TENANT, 'r1');
    first.steps.push({ n: 99, tool: 'palsu' });

    expect((await store.get(TENANT, 'r1')).steps).toHaveLength(0);
  });
});
