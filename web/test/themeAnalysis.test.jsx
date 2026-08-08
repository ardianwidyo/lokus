import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededReputationSource } from '../src/data/reputationSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';
import { intensityStyle } from '../src/screens/theme/Sparkline.jsx';

const renderThemes = async (source = null) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role: 'manager' }),
  );
  window.history.pushState({}, '', '/tema');
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      reputationSource={source ?? createSeededReputationSource()}
    />,
  );
  await screen.findByRole('table');
  return utils;
};

describe('Screen 07 · Analisis tema & sentimen (AC-2.3)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('renders a theme × branch matrix with an 8-week trend per row', async () => {
    await renderThemes();

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    // Header plus one row per theme found in the text.
    expect(rows.length).toBeGreaterThan(1);

    const antrean = screen.getByRole('row', { name: /Antrean kasir/ });
    expect(within(antrean).getByRole('img', { name: /tren 8 pekan/i })).toBeInTheDocument();
  });

  it('shows counts that came from clustering, not from markup', async () => {
    await renderThemes();

    const antrean = screen.getByRole('row', { name: /Antrean kasir/ });
    const cells = within(antrean).getAllByRole('cell');

    // Bekasi carries 31 checkout complaints over the window.
    expect(cells[0]).toHaveTextContent('31');
  });

  it('flags the systemic theme with the number of regions behind it (AC-2.2)', async () => {
    await renderThemes();

    const antrean = screen.getByRole('row', { name: /Antrean kasir/ });

    expect(within(antrean).getByText(/\d wilayah/)).toBeInTheDocument();
  });

  it('leads with the systemic finding and names the worst branch', async () => {
    await renderThemes();

    expect(
      screen.getByText('Antrean kasir adalah masalah semua cabang, bukan satu cabang'),
    ).toBeInTheDocument();
    expect(screen.getByText(/terburuk: Bekasi Timur/)).toBeInTheDocument();
  });

  it('says how many reviews and citations are behind the matrix', async () => {
    await renderThemes();

    expect(screen.getByText(/\d+ review dibaca · \d+ sumber dikutip/)).toBeInTheDocument();
  });

  it('marks the replication candidate as a comparison, not a verified finding', async () => {
    await renderThemes();

    expect(screen.getByText(/cek dulu sebelum ditiru/)).toBeInTheDocument();
  });

  it('gives the table a caption for screen readers', async () => {
    await renderThemes();

    expect(
      screen.getByText(/Jumlah review keluhan per tema dan cabang/),
    ).toBeInTheDocument();
  });

  it('shows the empty state when no theme was detected', async () => {
    const source = createSeededReputationSource();
    source.themeMatrix = async () => ({
      themes: [],
      finding: null,
      weeks: 8,
      reviewsConsidered: 0,
      sourceCount: 0,
      sentimentByWeek: [],
      bestPractice: null,
    });

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/tema');
    render(<App sessionSource={createSeededSessionSource()} reputationSource={source} />);

    expect(await screen.findByText('Belum ada tema yang terdeteksi')).toBeInTheDocument();
  });

  it('shows the error state with a retry', async () => {
    const source = createSeededReputationSource();
    source.themeMatrix = async () => {
      throw new Error('Layanan analitik tidak menjawab.');
    };

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/tema');
    render(<App sessionSource={createSeededSessionSource()} reputationSource={source} />);

    const title = await screen.findByText('Analisis tema gagal ditampilkan');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
  });
});

describe('intensity ramp', () => {
  it('uses one accent ramp and never a second hue', () => {
    const styles = [1, 5, 12, 22, 31].map((value) => intensityStyle(value, 31));

    expect(styles.every((style) => style.background.startsWith('var(--color-accent-'))).toBe(true);
  });

  it('leaves an empty cell transparent rather than tinting it', () => {
    expect(intensityStyle(0, 31).background).toBe('transparent');
  });

  it('flips text to the ground colour once the tint is dark', () => {
    expect(intensityStyle(31, 31).color).toBe('var(--color-bg)');
    expect(intensityStyle(1, 31).color).toBe('var(--color-text)');
  });
});
