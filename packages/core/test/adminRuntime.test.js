import { describe, expect, it } from 'vitest';

import { createAdminService } from '../src/services/adminService.js';
import { createBudgetGuard } from '../src/cost/budget.js';

const REPORT = { generatedAt: null, cases: 0, gates: [] };

const rowsFor = async (runtime) => {
  const budget = createBudgetGuard();
  const service = createAdminService({ budget, evaluationReport: REPORT, runtime });
  const { models } = await service.overview('nusa-retail');
  return Object.fromEntries(models.map((row) => [row.label, row]));
};

/**
 * Screen 14 is the production-readiness evidence panel, so a claim it prints
 * has to be one the process can back. These rows were six literal strings until
 * 2026-08-07 — they named Agent Engine and Cloud Run on a laptop with neither.
 */
describe('screen 14 · models panel reports the running stack', () => {
  it('names the pin and the endpoint when Vertex is live', async () => {
    const rows = await rowsFor({
      reasoning: 'vertex',
      model: 'gemini-3.5-flash',
      flashModel: 'gemini-3.5-flash-lite',
      location: 'global',
      onCloudRun: true,
      region: 'asia-southeast2',
    });

    expect(rows['Penalaran'].value).toBe('gemini-3.5-flash · Vertex AI');
    expect(rows['Ringkasan borongan'].value).toBe('gemini-3.5-flash-lite · Vertex AI');
    expect(rows['Alamat model'].value).toBe('global · aiplatform.googleapis.com');
    expect(rows['Tempat API berjalan'].value).toBe('Cloud Run · asia-southeast2');
  });

  it('says deterministic rather than naming a model nobody called', async () => {
    // The default is the truth for a browser tab, which is what the public
    // demo is: no credentials, no API, no model.
    const rows = await rowsFor(undefined);

    expect(rows['Penalaran'].value).toBe('Aturan tetap, tanpa AI');
    expect(rows['Ringkasan borongan'].value).toBe('Aturan tetap, tanpa AI');
    expect(rows['Alamat model'].value).toBe('—');
    expect(rows['Tempat API berjalan'].value).toBe('Node lokal');
  });

  it('never prints Cloud Run from a config value alone', async () => {
    // A region is configured everywhere, including on a laptop. Only K_SERVICE
    // — which the API reads — says the process is actually on Cloud Run.
    const rows = await rowsFor({ onCloudRun: false, region: 'asia-southeast2' });

    expect(rows['Tempat API berjalan'].value).not.toContain('Cloud Run');
  });

  it('marks the planned stack as planned, in both configurations', async () => {
    for (const runtime of [undefined, { reasoning: 'vertex', model: 'm', flashModel: 'f', location: 'global' }]) {
      const rows = await rowsFor(runtime);

      // Enabling an API in the Cloud console does not make it called. These two
      // stay `planned` until code calls them.
      expect(rows['Indeks pencarian terkelola'].status).toBe('planned');
      expect(rows['Tempat agen terkelola'].status).toBe('planned');
      // And what does run says so without qualification.
      expect(rows['Pencarian dokumen'].status).toBe('live');
      expect(rows['Tempat agen berjalan'].value).toContain('packages/core');
    }
  });

  it('keeps the model project out of a payload that reaches a browser', async () => {
    const rows = await rowsFor({
      reasoning: 'vertex',
      model: 'gemini-3.5-flash',
      flashModel: 'gemini-3.5-flash-lite',
      location: 'global',
      projectId: 'ebco-aihack-ardian',
    });

    expect(JSON.stringify(rows)).not.toContain('ebco-aihack-ardian');
  });
});
