import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededLocationSource } from '../src/data/locationSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';
import { project } from '../src/screens/map/MapField.jsx';

const renderMap = async (locationSource = null) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role: 'manager' }),
  );
  window.history.pushState({}, '', '/peta');
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      locationSource={locationSource ?? createSeededLocationSource()}
    />,
  );
  await screen.findByRole('img', { name: /Peta \d+ cabang/ });
  return utils;
};

describe('Screen 03 · Peta jaringan cabang (T033)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('says how much of the estate the dataset actually covers', async () => {
    await renderMap();

    // The rail says "42 cabang" from the tenant record while the map draws 8.
    // Both are true; leaving the reader to reconcile them is what is not.
    expect(screen.getByText(/8 dari 42 cabang ada di data contoh/)).toBeInTheDocument();
  });

  it('draws every outlet and the competitors around them', async () => {
    await renderMap();

    const field = screen.getByRole('img', { name: /Peta \d+ cabang/ });

    expect(field.getAttribute('aria-label')).toMatch(/Peta 8 cabang dan \d+ pesaing/);
    expect(field.querySelectorAll('.map-outlet')).toHaveLength(8);
    expect(field.querySelectorAll('.map-competitor').length).toBeGreaterThan(0);
  });

  it('lists branches by lowest score first, so the one needing attention is on top', async () => {
    await renderMap();

    // Scoped to the list: the SVG markers are buttons too, by design.
    const rows = [...document.querySelectorAll('.score-row')];
    const scores = rows.map((row) => Number(row.querySelector('.score-value').textContent));

    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
    expect(rows[0]).toHaveTextContent('Depok Margonda');
  });

  it('shows a rating alongside each score, from the same review set', async () => {
    await renderMap();
    const depok = [...document.querySelectorAll('.score-row')].find((row) =>
      row.textContent.includes('Depok Margonda'),
    );

    expect(depok.querySelector('.score-rating').textContent).toMatch(/^\d,\d+$/);
  });

  it('says which score factors are measured and which are surveyed', async () => {
    await renderMap();

    // Presenting a surveyed footfall figure as measured would overstate it.
    expect(screen.getByText(/dari Places/)).toBeInTheDocument();
    expect(screen.getAllByText(/· survei/).length).toBe(3);
  });

  it('writes the agent note from what the cannibalisation check found', async () => {
    await renderMap();
    const panel = screen.getByText('Catatan agen lokasi').closest('.panel');

    expect(within(panel).getByRole('heading')).toBeInTheDocument();
    expect(panel.textContent).toMatch(/pesaing|km/);
  });

  it('switches what the map labels say without redrawing the markers', async () => {
    await renderMap();
    const field = screen.getByRole('img', { name: /Peta \d+ cabang/ });

    expect(field.textContent).toMatch(/skor \d+/);
    // "Kepadatan pesaing" is also a factor label, so scope to the layer chips.
    const layers = screen.getByRole('radiogroup', { name: 'Lapisan peta' });
    await userEvent.click(within(layers).getByText('Kepadatan pesaing'));

    expect(field.textContent).toMatch(/\d+ pesaing/);
    expect(field.querySelectorAll('.map-outlet')).toHaveLength(8);
  });

  it('selects a branch from the list and from the map', async () => {
    await renderMap();

    const bogor = [...document.querySelectorAll('.score-row')].find((row) =>
      row.textContent.includes('Bogor Pajajaran'),
    );
    await userEvent.click(bogor);

    expect(screen.getByText(/Faktor skor · Bogor Pajajaran/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buka detail Bogor Pajajaran/ })).toBeInTheDocument();
  });

  it('marks a newly opened competitor differently from an established one', async () => {
    await renderMap();
    const field = screen.getByRole('img', { name: /Peta \d+ cabang/ });

    expect(field.querySelectorAll('.map-competitor.is-new').length).toBeGreaterThan(0);
  });

  it('shows the error state with a retry', async () => {
    const source = createSeededLocationSource();
    source.networkMap = async () => {
      throw new Error('Layanan lokasi tidak menjawab.');
    };

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/peta');
    render(<App sessionSource={createSeededSessionSource()} locationSource={source} />);

    const title = await screen.findByText('Peta gagal ditampilkan');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
  });
});

describe('map projection', () => {
  const points = [
    { geo: { lat: -6.2, lng: 106.8 } },
    { geo: { lat: -6.6, lng: 107.2 } },
  ];

  it('keeps north above south', () => {
    const to = project(points);

    expect(to(points[0].geo).y).toBeLessThan(to(points[1].geo).y);
  });

  it('keeps east right of west', () => {
    const to = project(points);

    expect(to(points[0].geo).x).toBeLessThan(to(points[1].geo).x);
  });

  it('does not divide by zero for a single point', () => {
    const to = project([{ geo: { lat: -6.2, lng: 106.8 } }]);
    const projected = to({ lat: -6.2, lng: 106.8 });

    expect(Number.isFinite(projected.x)).toBe(true);
    expect(Number.isFinite(projected.y)).toBe(true);
  });
});
