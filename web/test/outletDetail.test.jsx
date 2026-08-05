import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededOutletSource } from '../src/data/outletSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const renderOutlet = async ({ outlet = null, outletSource = null } = {}) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role: 'manager' }),
  );
  window.history.pushState({}, '', outlet ? `/cabang?outlet=${outlet}` : '/cabang');

  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      outletSource={outletSource ?? createSeededOutletSource()}
    />,
  );
  await screen.findByText(/Manajer:/, {}, { timeout: 4000 });
  return utils;
};

describe('Screen 04 · Detail cabang (T034)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('opens on the branch the network map linked to', async () => {
    await renderOutlet({ outlet: 'DPK-01' });

    expect(screen.getByRole('heading', { name: 'Depok Margonda' })).toBeInTheDocument();
    expect(screen.getByText(/Manajer: Sari Wulandari/)).toBeInTheDocument();
  });

  it('shows the identity and opening month in the kicker', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    expect(screen.getByText('BKS-02 · dibuka Maret 2021')).toBeInTheDocument();
    expect(screen.getByText(/Jl\. Chairil Anwar No\. 88/)).toBeInTheDocument();
  });

  it('shows the same rating the network map shows for that branch', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    expect(screen.getByText('3,80')).toBeInTheDocument();
    expect(screen.getByText('71')).toBeInTheDocument();
  });

  it('labels the rating movement with the window it was measured over', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    // "−0,4 bulan ini" would hide which four weeks were compared.
    expect(screen.getByText(/vs 4 pekan sebelumnya/)).toBeInTheDocument();
  });

  it('ranks the branch inside its own tenant', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    expect(screen.getByText('peringkat 6 dari 8')).toBeInTheDocument();
  });

  it('draws the weeks that exist and says it is not twelve', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    expect(screen.getByText(/Rating 8 pekan/)).toBeInTheDocument();
    expect(screen.getByText(/seluruh rentang review yang ada — bukan 12/)).toBeInTheDocument();
  });

  it('gives the chart a text description for a screen reader', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    expect(
      screen.getByRole('img', { name: /Rating rata-rata per pekan selama 8 pekan/ }),
    ).toBeInTheDocument();
  });

  it('breaks complaints into themes with counts', async () => {
    await renderOutlet({ outlet: 'BKS-02' });
    const panel = screen.getByText(/Tema keluhan/).closest('.panel');

    expect(within(panel).getByText('Antrean kasir')).toBeInTheDocument();
    expect(within(panel).getByText('31')).toBeInTheDocument();
  });

  it('says the theme percentages are of complaints, not of all reviews', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    expect(screen.getByText(/bagian dari 66 keluhan cabang ini, bukan dari/)).toBeInTheDocument();
  });

  it('marks which score factors were surveyed and which were measured', async () => {
    await renderOutlet({ outlet: 'BKS-02' });
    const panel = screen.getByText('Faktor skor lokasi').closest('.panel');

    expect(within(panel).getAllByText('· survei').length).toBe(3);
    expect(within(panel).getAllByText('· terukur').length).toBe(1);
  });

  it('writes the cross-signal sentence only from what the numbers say', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    // Parking is Bekasi's weakest factor (44) and its second complaint theme.
    expect(
      screen.getByText(/Ketersediaan parkir adalah faktor skor terlemah \(44\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/tema keluhan nomor 2 \(13 keluhan\)/)).toBeInTheDocument();
  });

  it('withholds the cross-signal sentence when the pair is a coincidence', async () => {
    // Cikarang's weakest factor is parking too, but parking is its sixth
    // complaint theme with two mentions — that corroborates nothing.
    await renderOutlet({ outlet: 'CKR-01' });

    expect(screen.queryByText(/dua sinyal berbeda menunjuk hal yang sama/)).toBeNull();
  });

  it('still writes it where the theme genuinely leads', async () => {
    // Serpong: parking is the weakest factor and the top complaint theme.
    await renderOutlet({ outlet: 'SRP-03' });

    expect(screen.getByText(/tema keluhan nomor 1 \(19 keluhan\)/)).toBeInTheDocument();
  });

  it('counts the waiting work on the button rather than rounding it', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    expect(
      screen.getByRole('button', { name: 'Lihat 12 review belum dibalas' }),
    ).toBeInTheDocument();
  });

  it('lets the reader switch branch without leaving the screen', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    await userEvent.click(await screen.findByRole('radio', { name: 'Bogor Pajajaran' }));

    expect(await screen.findByRole('heading', { name: 'Bogor Pajajaran' })).toBeInTheDocument();
    expect(await screen.findByText('peringkat 1 dari 8')).toBeInTheDocument();
  });
});

describe('Screen 04 · the change-point line (T034)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('says plainly when there is no opening to draw', async () => {
    await renderOutlet({ outlet: 'BKS-02' });

    expect(
      screen.getByText(/Tidak ada pembukaan pesaing tercatat di radius 1000 m/),
    ).toBeInTheDocument();
    expect(document.querySelector('.chart-event')).toBeNull();
  });

  it('draws the line and names the competitor when Places recorded one', async () => {
    await renderOutlet({ outlet: 'DPK-01' });

    const line = document.querySelector('.chart-event');
    expect(line).not.toBeNull();
    // Named on the chart itself, so the line is not an unexplained mark.
    expect(within(line).getByText(/28 Jun · Mitra Mart Margonda buka/)).toBeInTheDocument();
  });

  it('reports the rating move that week without claiming it was caused', async () => {
    await renderOutlet({ outlet: 'DPK-01' });

    expect(screen.getByText(/3,75 → 3,44/)).toBeInTheDocument();
    expect(screen.getByText(/hubungan sebabnya belum diuji/)).toBeInTheDocument();
  });
});

describe('Screen 04 · states (T034)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('shows the error state with a retry', async () => {
    const source = createSeededOutletSource();
    source.detail = async () => {
      throw new Error('Layanan cabang tidak menjawab.');
    };

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/cabang');
    render(<App sessionSource={createSeededSessionSource()} outletSource={source} />);

    const title = await screen.findByText('Detail cabang tak bisa dimuat');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
  });

  it('shows the empty state when the branch is not in this tenant', async () => {
    const source = createSeededOutletSource();
    // The service returns null for another tenant's branch; the screen must
    // read that as "nothing here", not render a half-filled header.
    source.detail = async () => null;

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/cabang?outlet=LAIN-01');
    render(<App sessionSource={createSeededSessionSource()} outletSource={source} />);

    const title = await screen.findByText('Cabang tidak ditemukan', {}, { timeout: 4000 });
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'empty');
  });

  it('keeps the branch picker usable when one branch fails to load', async () => {
    const source = createSeededOutletSource();
    source.detail = async () => {
      throw new Error('gagal');
    };

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/cabang');
    render(<App sessionSource={createSeededSessionSource()} outletSource={source} />);

    await screen.findByText('Detail cabang tak bisa dimuat');
    expect(await screen.findByRole('radio', { name: 'Depok Margonda' })).toBeInTheDocument();
  });
});
