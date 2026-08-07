import { describe, expect, it } from 'vitest';

import { createServices, vertexFromEnv } from '../src/services/index.js';

const EMPTY_REPORT = { generatedAt: null, cases: 0, gates: [] };

/**
 * The switch that decides whether a run spends money. It is one boolean deep in
 * the wiring, which is exactly the kind of thing that gets flipped by accident
 * and noticed on the bill, so it is tested from both sides.
 */
describe('Vertex AI wiring', () => {
  it('stays deterministic unless the environment asks for Vertex by name', () => {
    // GOOGLE_CLOUD_PROJECT is set on every run, including the demo. Gating on
    // it alone would start billing without anyone choosing to.
    expect(vertexFromEnv({ GOOGLE_CLOUD_PROJECT: 'ebco-aihack-ardian' })).toEqual({});
    expect(vertexFromEnv({ GOOGLE_CLOUD_PROJECT: 'p', LOKUS_REASONING: 'deterministic' })).toEqual({});

    const services = createServices({ evaluationReport: EMPTY_REPORT, vertex: {} });
    expect(services.gemini).toBeNull();
    expect(services.reasoning).toBe('deterministic');
  });

  it('configures the adapter when LOKUS_REASONING says vertex', () => {
    const config = vertexFromEnv({
      LOKUS_REASONING: 'Vertex',
      GOOGLE_CLOUD_PROJECT: 'ebco-aihack-ardian',
      GOOGLE_CLOUD_LOCATION: 'asia-southeast1',
    });

    expect(config.projectId).toBe('ebco-aihack-ardian');
    expect(config.location).toBe('asia-southeast1');
    expect(typeof config.getAccessToken).toBe('function');

    const services = createServices({ evaluationReport: EMPTY_REPORT, vertex: config });
    expect(services.reasoning).toBe('vertex');
    expect(services.gemini.location).toBe('asia-southeast1');
  });

  it('defaults the location rather than inheriting the deployment region', () => {
    // asia-southeast2 hosts the rest of the stack and does not serve these
    // models — it answers 400 FAILED_PRECONDITION (measured 2026-08-07).
    const config = vertexFromEnv({ LOKUS_REASONING: 'vertex', GOOGLE_CLOUD_PROJECT: 'p' });
    const services = createServices({ evaluationReport: EMPTY_REPORT, vertex: config });

    expect(services.gemini.location).toBe('global');
  });

  it('falls back to deterministic when Vertex is asked for without a project', () => {
    // A half-configuration must degrade at wiring time, not throw on the first
    // question a manager asks.
    const config = vertexFromEnv({ LOKUS_REASONING: 'vertex' });
    const services = createServices({ evaluationReport: EMPTY_REPORT, vertex: config });

    expect(services.gemini).toBeNull();
    expect(services.reasoning).toBe('deterministic');
  });
});
