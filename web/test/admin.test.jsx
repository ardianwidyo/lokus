import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededAdminSource } from '../src/data/adminSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const renderAdmin = async (adminSource = null) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role: 'admin' }),
  );
  window.history.pushState({}, '', '/admin');
  const utils = render(
    <App sessionSource={createSeededSessionSource()} adminSource={adminSource ?? createSeededAdminSource()} />,
  );
  await screen.findByText('Hasil golden set');
  return utils;
};

describe('Screen 14 · Admin (AC-6.2)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('reports the stack this build actually runs, not the one it plans', async () => {
    // The seeded console is a browser tab: no model, no Cloud Run. It used to
    // print "Gemini · Vertex AI" and "Cloud Run · 2 svc" here regardless, which
    // is the one claim on this screen a judge could disprove from the URL bar.
    await renderAdmin();

    expect(screen.getAllByText('Jalur deterministik').length).toBeGreaterThan(0);
    expect(screen.getByText('Node lokal')).toBeInTheDocument();
    expect(screen.getByText('Skoring kata kunci · packages/core')).toBeInTheDocument();
  });

  it('keeps the planned stack visible but marked, never claimed', async () => {
    // Deleting these rows would hide the architecture; printing them unmarked
    // would assert it. Marked is the only honest third option.
    await renderAdmin();

    const searchIndex = screen.getByText('Vertex AI Search · text-embedding-004');
    const agentEngine = screen.getByText('Vertex AI Agent Engine');

    expect(within(searchIndex.closest('dd')).getByText('belum tersambung')).toBeInTheDocument();
    expect(within(agentEngine.closest('dd')).getByText('belum tersambung')).toBeInTheDocument();
  });

  it('names the live model pin when the API reports one', async () => {
    // What a judge sees when the console runs against an API with Vertex on.
    const source = {
      isSeeded: false,
      overview: async () => ({
        ...(await createSeededAdminSource().overview()),
        models: [
          { label: 'Penalaran', value: 'gemini-3.5-flash · Vertex AI', status: 'live' },
          { label: 'Endpoint model', value: 'global · aiplatform.googleapis.com', status: 'live' },
        ],
      }),
    };

    await renderAdmin(source);

    expect(screen.getByText('gemini-3.5-flash · Vertex AI')).toBeInTheDocument();
    expect(screen.getByText('global · aiplatform.googleapis.com')).toBeInTheDocument();
    expect(screen.queryByText('Jalur deterministik')).not.toBeInTheDocument();
  });

  it('lists the guardrails and says where each is enforced', async () => {
    await renderAdmin();

    expect(screen.getByText('Balasan bintang 1–2 wajib disetujui manusia')).toBeInTheDocument();
    // The claim is checkable in the source, not just asserted on a slide.
    expect(screen.getByText('ditegakkan di approvals.js')).toBeInTheDocument();
    expect(screen.getByText('ditegakkan di retrieval.js')).toBeInTheDocument();
  });

  it('shows the confidence threshold the refusal rule uses', async () => {
    await renderAdmin();

    // Indonesian decimal comma, matching the guardrail toggle's own label a few
    // lines up — the two used to disagree (0.70 here, 0,70 there) because this
    // figure was formatted with a bare `.toFixed(2)`. Since US-8 both read off
    // the same locale-aware formatter.
    expect(screen.getByText('0,70')).toBeInTheDocument();
  });

  it('shows spend against the hard ceiling and the degrade point', async () => {
    await renderAdmin();

    expect(screen.getByText('Rp 1,84 jt')).toBeInTheDocument();
    expect(screen.getByText(/34% dari batas keras Rp 5,40 jt/)).toBeInTheDocument();
    expect(screen.getByText(/Di\s+atas 90%, agen turun ke mode Flash/)).toBeInTheDocument();
  });

  it('renders the eval gates from a report the runner produced', async () => {
    await renderAdmin();
    const table = screen.getByRole('table');

    for (const label of [
      'Ketepatan tema keluhan',
      'Sitasi benar & relevan',
      'Kepatuhan nada brand',
      'Halusinasi terdeteksi',
      'Latensi p95',
    ]) {
      expect(within(table).getByText(label)).toBeInTheDocument();
    }
    expect(within(table).getAllByText('lolos')).toHaveLength(5);
  });

  it('shows each gate next to the threshold it was measured against', async () => {
    await renderAdmin();
    const row = screen.getByRole('row', { name: /Halusinasi terdeteksi/ });

    expect(within(row).getByText('< 0.05')).toBeInTheDocument();
  });

  it('says the eval blocks a merge, and where the report came from', async () => {
    await renderAdmin();

    expect(screen.getByText(/CI memblokir merge bila satu ambang saja gagal/)).toBeInTheDocument();
    expect(screen.getByText('eval/run_eval.mjs')).toBeInTheDocument();
  });

  it('lists the operational stack', async () => {
    await renderAdmin();

    for (const tool of ['Terraform', 'GitHub Actions', 'Secret Manager']) {
      expect(screen.getByText(tool)).toBeInTheDocument();
    }
  });

  it('shows the failure reason rather than a bare error title', async () => {
    const source = createSeededAdminSource();
    source.overview = async () => {
      throw new Error('Layanan admin sedang dipelihara.');
    };

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'admin' }),
    );
    window.history.pushState({}, '', '/admin');
    render(<App sessionSource={createSeededSessionSource()} adminSource={source} />);

    expect(await screen.findByText('Hasil evaluasi tak bisa dimuat')).toBeInTheDocument();
    expect(screen.getAllByText('Layanan admin sedang dipelihara.').length).toBeGreaterThan(0);
  });
});
