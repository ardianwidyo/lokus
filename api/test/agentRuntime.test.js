import { describe, expect, it } from 'vitest';

import { CLASS_METHODS, buildAgentRuntime } from '../src/agentRuntime.js';

const EMPTY_REPORT = { generatedAt: null, cases: 0, gates: [] };

const runtime = async () => {
  const { createServices } = await import('../src/services/index.js');
  return buildAgentRuntime({
    services: createServices({ evaluationReport: EMPTY_REPORT }),
    logger: false,
  });
};

const post = (fastify, body) =>
  fastify.inject({ method: 'POST', url: '/api/reasoning_engine', payload: body });

/**
 * Agent Runtime's BYOC contract, which is two paths and a JSON envelope. These
 * tests are the only thing standing between a container that answers and a
 * deployment that fails with an opaque INTERNAL and no logs.
 */
describe('supervisor as an Agent Engine container', () => {
  it('answers the contract envelope, not the API shape', async () => {
    const fastify = await runtime();

    const response = await post(fastify, {
      class_method: 'ask',
      input: { tenantId: 'nusa-retail', question: 'Kenapa rating Bekasi Timur turun?' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    // `{output: ...}` is the contract. A bare run object deploys and then fails
    // on the first query, which is the worst time to find out.
    expect(Object.keys(body)).toEqual(['output']);
    expect(body.output.steps.length).toBeGreaterThan(0);
    expect(body.output.intent).toBeTruthy();

    await fastify.close();
  });

  it('declares the methods it will actually accept', async () => {
    // `classMethods` on create has to match what the container serves, or a
    // caller is told about a method that answers 400.
    const fastify = await runtime();

    const names = CLASS_METHODS.map((method) => method.name);
    for (const name of names) {
      const response = await post(fastify, { class_method: name, input: { tenantId: 'nusa-retail', question: 'apa' } });
      expect(response.statusCode).toBe(200);
    }

    expect((await fastify.inject({ method: 'GET', url: '/healthz' })).json().methods).toEqual(names);
    await fastify.close();
  });

  it('refuses a class_method it does not own, including inherited ones', async () => {
    // `methods[name]` without an own-property check resolves `constructor` and
    // `toString` to functions on Object.prototype, and the container would call
    // whatever it found.
    const fastify = await runtime();

    for (const name of ['constructor', 'toString', '__proto__', 'tidakAda']) {
      const response = await post(fastify, { class_method: name, input: {} });
      expect(response.statusCode).toBe(400);
    }

    await fastify.close();
  });

  it('treats a missing tenant as a bad request, not a server fault', async () => {
    // A 500 invites the caller to retry forever without ever being told what
    // it got wrong. Tenant isolation starts by insisting there is one.
    const fastify = await runtime();

    const response = await post(fastify, { class_method: 'ask', input: { question: 'tanpa tenant' } });

    expect(response.statusCode).toBe(400);
    await fastify.close();
  });

  it('carries the tenant from the input all the way into the run', async () => {
    // The runtime has no auth of its own — Agent Engine authenticates the
    // caller — so the tenant in `input` is the whole boundary and must reach
    // the supervisor unchanged.
    const fastify = await runtime();

    const response = await post(fastify, {
      class_method: 'ask',
      input: { tenantId: 'klinik-sehat-prima', question: 'Apa aturan refund?' },
    });

    expect(response.json().output.tenantId).toBe('klinik-sehat-prima');
    await fastify.close();
  });

  it('refuses one tenant a question about another tenant branch', async () => {
    const fastify = await runtime();

    const response = await post(fastify, {
      class_method: 'ask',
      input: { tenantId: 'klinik-sehat-prima', question: 'Kenapa rating Bekasi Timur turun?' },
    });

    // The boundary holds: the branch belongs to Nusa Retail and the domain
    // refuses by name. The status is the domain error's own — this runtime does
    // not invent a mapping the HTTP API does not already use, so a refusal
    // reads identically whichever door the question came through.
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.json().code).toBe('OUTLET_NOT_FOUND');

    await fastify.close();
  });

  it('emits the stream path in the stream shape', async () => {
    const fastify = await runtime();

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/stream_reasoning_engine',
      payload: { class_method: 'ask', input: { tenantId: 'nusa-retail', question: 'apa' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.endsWith('\n')).toBe(true);
    expect(JSON.parse(response.body).output.intent).toBeTruthy();

    await fastify.close();
  });
});
