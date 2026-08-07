import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { healthRoutes } from '../src/routes/health.js';
import { createServices, reasoningFromEnv } from '../src/services/index.js';

const EMPTY_REPORT = { generatedAt: null, cases: 0, gates: [] };
const CONFIG = { environment: 'dev', region: 'asia-southeast2' };

/** The env of a machine that has both paths configured. */
const BOTH = {
  GOOGLE_CLOUD_PROJECT: 'ebco-aihack-ardian',
  GEMINI_API_KEY: 'AIzaSyTOP-SECRET-KEY',
};

const servicesFor = (env) =>
  createServices({ evaluationReport: EMPTY_REPORT, reasoning: reasoningFromEnv(env) });

async function healthOf(env) {
  const services = servicesFor(env);
  const fastify = Fastify();
  healthRoutes(fastify, {
    config: CONFIG,
    snapshot: () => ({ reasoning: services.reasoning, model: services.reasoningModel }),
  });

  const response = await fastify.inject({ method: 'GET', url: '/healthz' });
  await fastify.close();
  return response.json();
}

/**
 * The switch that decides whether a run spends money, and through which door.
 * It is one string deep in the wiring, which is exactly the kind of thing that
 * gets flipped by accident and noticed on the bill.
 */
describe('reasoning path wiring', () => {
  it('stays deterministic unless the environment asks for a model by name', () => {
    // GOOGLE_CLOUD_PROJECT is set on every run, including the demo. Gating on
    // it alone would start billing without anyone choosing to.
    const services = servicesFor(BOTH);

    expect(services.reasoning).toBe('deterministic');
    expect(services.gemini.enabled).toBe(false);
  });

  it('takes the Vertex path when asked, and the key path when asked', () => {
    expect(servicesFor({ ...BOTH, LOKUS_REASONING: 'vertex' }).reasoning).toBe('vertex');
    expect(servicesFor({ ...BOTH, LOKUS_REASONING: 'apikey' }).reasoning).toBe('apikey');
  });

  it('offers only the paths this process could actually take', () => {
    const onlyKey = servicesFor({ GEMINI_API_KEY: 'AIza-key' }).gemini.options();

    expect(onlyKey.find((o) => o.id === 'apikey').available).toBe(true);
    expect(onlyKey.find((o) => o.id === 'vertex').available).toBe(false);
    // Always available, because it needs nothing.
    expect(onlyKey.find((o) => o.id === 'deterministic').available).toBe(true);
  });

  it('falls back rather than refusing to boot on an unavailable path', () => {
    // An API that will not start because a key expired turns a degraded
    // reasoning layer into an outage.
    const services = servicesFor({ LOKUS_REASONING: 'apikey' });

    expect(services.reasoning).toBe('deterministic');
  });

  it('is locked unless an operator opened it, and refuses a change when locked', () => {
    // The choice is process-wide, so one tenant's admin must not be able to
    // change how another tenant's answers are produced.
    const locked = servicesFor({ ...BOTH, LOKUS_REASONING: 'vertex' }).gemini;
    expect(locked.mutable).toBe(false);
    expect(() => locked.select('apikey')).toThrow(/dikunci/);

    const open = servicesFor({ ...BOTH, LOKUS_REASONING: 'vertex', LOKUS_REASONING_SWITCHABLE: 'true' }).gemini;
    expect(open.select('apikey')).toBe('apikey');
    expect(open.enabled).toBe(true);
  });

  it('refuses a path it cannot take rather than accepting and ignoring it', () => {
    // A control that reports success while nothing changed teaches the
    // operator to distrust the screen.
    const services = servicesFor({
      GOOGLE_CLOUD_PROJECT: 'p',
      LOKUS_REASONING_SWITCHABLE: 'true',
    }).gemini;

    expect(() => services.select('apikey')).toThrow(/belum dikonfigurasi/);
    expect(() => services.select('mars')).toThrow(/tidak dikenal/);
  });

  it('reports the live path on screen 14 after a switch, not the boot value', async () => {
    // The panel used to be built once. A switch would have left it reporting
    // the path the process started with.
    const services = servicesFor({ ...BOTH, LOKUS_REASONING: 'vertex', LOKUS_REASONING_SWITCHABLE: 'true' });

    const before = await services.admin.overview('nusa-retail');
    expect(before.models[0].value).toContain('Vertex AI');

    services.gemini.select('apikey');

    const after = await services.admin.overview('nusa-retail');
    expect(after.models[0].value).toContain('AI Studio');
    expect(after.models.find((row) => row.label === 'Endpoint model').value).toBe(
      'generativelanguage.googleapis.com',
    );
  });

  it('never puts a credential in the payload a browser reads', async () => {
    // Not the key, not a prefix of it, not the project id: a prefix is enough
    // to confirm a guess.
    const services = servicesFor({ ...BOTH, LOKUS_REASONING: 'apikey' });

    const payload = JSON.stringify([await services.admin.overview('nusa-retail'), services.gemini.options()]);

    expect(payload).not.toContain('AIzaSyTOP-SECRET-KEY');
    expect(payload).not.toContain('AIzaSy');
    expect(payload).not.toContain('ebco-aihack-ardian');
  });
});

describe('/healthz reports the reasoning path', () => {
  it('names the live path and the model pin', async () => {
    const body = await healthOf({ ...BOTH, LOKUS_REASONING: 'vertex' });
    expect(body).toMatchObject({ status: 'ok', reasoning: 'vertex', model: 'gemini-3.5-flash' });

    const viaKey = await healthOf({ ...BOTH, LOKUS_REASONING: 'apikey' });
    expect(viaKey).toMatchObject({ reasoning: 'apikey', model: 'gemini-3.5-flash' });
  });

  it('names no model on the deterministic path, because none was called', async () => {
    const body = await healthOf({});

    expect(body.reasoning).toBe('deterministic');
    expect(body.model).toBeNull();
  });

  it('never puts the project, the location or the key on an unauthenticated endpoint', async () => {
    // The probe is public by design (Cloud Run invokes it as allUsers). It
    // answers "which mode", not "which billable resource".
    const body = await healthOf({ ...BOTH, LOKUS_REASONING: 'vertex', GOOGLE_CLOUD_LOCATION: 'asia-southeast1' });

    const payload = JSON.stringify(body);
    expect(payload).not.toContain('ebco-aihack-ardian');
    expect(payload).not.toContain('asia-southeast1');
    expect(payload).not.toContain('AIzaSy');
  });
});
