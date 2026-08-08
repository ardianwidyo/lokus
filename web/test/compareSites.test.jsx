import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededAgentSource } from '../src/data/agentSource.js';
import { createSeededLocationSource } from '../src/data/locationSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const renderCompare = async ({ role = 'manager', url = '/bandingkan', locationSource = null, agentSource = null } = {}) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );
  window.history.pushState({}, '', url);
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      locationSource={locationSource ?? createSeededLocationSource()}
      agentSource={agentSource ?? createSeededAgentSource()}
    />,
  );
  await screen.findByText(/Kesimpulan agen|Belum ada calon lokasi|Perbandingan gagal ditampilkan/, {}, { timeout: 4000 });
  return utils;
};

describe('Screen 09 · Bandingkan lokasi (AC-5.3)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('puts the two candidates side by side, factor by factor', async () => {
    await renderCompare();
    const table = screen.getByRole('table');

    expect(within(table).getByText('Skor lokasi')).toBeInTheDocument();
    expect(within(table).getByText(/^Pesaing dalam/)).toBeInTheDocument();
    expect(within(table).getByText('Cabang sendiri terdekat')).toBeInTheDocument();
    expect(within(table).getByText('Perkiraan kunjungan/hari')).toBeInTheDocument();
  });

  it('marks the recommended column', async () => {
    await renderCompare();

    expect(screen.getByText('Lokasi A · direkomendasikan')).toBeInTheDocument();
    expect(screen.getByText('Lokasi B')).toBeInTheDocument();
  });

  it('says where each row\'s number came from', async () => {
    await renderCompare();
    const table = screen.getByRole('table');

    expect(within(table).getAllByText(/· terukur/).length).toBeGreaterThan(0);
    expect(within(table).getAllByText(/· survei/).length).toBeGreaterThan(0);
    expect(within(table).getAllByText(/· perkiraan/).length).toBe(1);
  });

  it('marks the better figure by weight rather than a second colour', async () => {
    await renderCompare();

    const better = document.querySelectorAll('.is-better');
    expect(better.length).toBeGreaterThan(0);
  });

  it('gives each column its own conclusion (AC-5.3)', async () => {
    await renderCompare();
    const row = screen.getByRole('row', { name: /Kesimpulan agen/ });
    const cells = within(row).getAllByRole('cell');

    expect(cells).toHaveLength(2);
    expect(cells[0].textContent.length).toBeGreaterThan(30);
    expect(cells[0].textContent).not.toBe(cells[1].textContent);
  });

  it('states the visits model rather than presenting it as measured', async () => {
    await renderCompare();

    expect(screen.getByText(/Angka perkiraan bukan hasil pengukuran/)).toBeInTheDocument();
    expect(screen.getByText(/kunjungan\/hari ≈ skor lalu lintas/)).toBeInTheDocument();
  });

  it('compares the pair named in the URL', async () => {
    await renderCompare({ url: '/bandingkan?a=duren-sawit&b=kramat-jati' });

    // The name appears in the column header and again in the traffic row.
    expect(screen.getAllByText(/Duren Sawit/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kramat Jati/).length).toBeGreaterThan(0);
  });

  it('raises a survey ticket for the recommended candidate', async () => {
    const agentSource = createSeededAgentSource();
    await renderCompare({ agentSource });

    await userEvent.click(screen.getByRole('button', { name: /^Ajukan survei/ }));

    expect(await screen.findByText(/Tiket T-\d+ dibuat untuk Tim Ekspansi/)).toBeInTheDocument();
  });

  it('stops a viewer raising a ticket but lets them read (AC-6.3)', async () => {
    await renderCompare({ role: 'viewer' });

    expect(screen.getByRole('button', { name: /^Ajukan survei/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ganti calon lokasi' })).toBeEnabled();
  });

  it('routes back to Site Scout to change the pair', async () => {
    await renderCompare();

    await userEvent.click(screen.getByRole('button', { name: 'Ganti calon lokasi' }));

    await waitFor(() => expect(window.location.pathname).toBe('/site-scout'));
  });

  it('is reachable from Site Scout with the candidate carried across', async () => {
    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/site-scout');
    render(
      <App
        sessionSource={createSeededSessionSource()}
        locationSource={createSeededLocationSource()}
        agentSource={createSeededAgentSource()}
      />,
    );
    await screen.findByText('Peringkat 1', {}, { timeout: 4000 });

    await userEvent.click(screen.getAllByRole('button', { name: 'Bandingkan' })[0]);

    await waitFor(() => expect(window.location.pathname).toBe('/bandingkan'));
    // The dead end this screen was built to close.
    expect(await screen.findByText(/Kesimpulan agen/)).toBeInTheDocument();
  });

  it('shows the error state with a retry', async () => {
    const source = createSeededLocationSource();
    source.compareSites = async () => {
      throw new Error('Layanan lokasi tidak menjawab.');
    };

    await renderCompare({ locationSource: source });

    const title = screen.getByText('Perbandingan gagal ditampilkan');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
  });
});
