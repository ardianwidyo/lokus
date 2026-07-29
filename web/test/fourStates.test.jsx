import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { PANEL_STATUS } from '../src/components/states/index.js';
import { SCREENS } from '../src/app/screens.js';
import { createSeededAdminSource } from '../src/data/adminSource.js';
import { createSeededAgentSource } from '../src/data/agentSource.js';
import { createSeededBriefingSource } from '../src/data/briefingSource.js';
import { createSeededReputationSource } from '../src/data/reputationSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

/**
 * T055 — the four-state audit, written as a test rather than performed once by
 * hand. A screen added later that forgets a state fails here.
 *
 * The constitution requires every data panel to implement loading, empty,
 * error and needs-permission. `DataPanel` is what makes that structural, so
 * the audit checks that every built screen renders through it and declares
 * which state it is in.
 *
 * The seeded sources are built once for the whole file. Building them per
 * render generates 713 reviews and re-clusters them each time, which starved
 * the CPU enough to time out unrelated suites running in parallel.
 */

const signIn = (role = 'manager') =>
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );

let shared;

beforeAll(() => {
  shared = {
    sessionSource: createSeededSessionSource(),
    reputationSource: createSeededReputationSource(),
    agentSource: createSeededAgentSource(),
    briefingSource: createSeededBriefingSource(),
    adminSource: createSeededAdminSource(),
  };
});

const renderScreen = (path, overrides = {}) => {
  window.history.pushState({}, '', path);
  return render(<App {...shared} {...overrides} />);
};

const panels = () => [...document.querySelectorAll('.panel')];

const failing = (base, methods) => ({
  ...base,
  ...Object.fromEntries(
    methods.map((m) => [m, async () => { throw new Error('Sumber data gagal.'); }]),
  ),
});

describe('T055 · four-state audit', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  // Every screen, not only the built ones: a placeholder must render through
  // DataPanel too, or it is a blank page pretending to be a state.
  it.each(SCREENS.map((s) => s.id))('screen %s renders its data through DataPanel', async (id) => {
    signIn();
    renderScreen(SCREENS.find((s) => s.id === id).path);

    await waitFor(() => expect(panels().length).toBeGreaterThan(0));

    // Every panel must declare which of the four states it is in — a panel
    // with no data-status is one that skipped DataPanel entirely.
    for (const panel of panels()) {
      expect(
        Object.values(PANEL_STATUS),
        `${id}: a panel rendered without a declared state`,
      ).toContain(panel.getAttribute('data-status'));
    }
  });

  it.each([
    ['briefing', 'briefingSource', ['briefing']],
    ['review', 'reputationSource', ['inbox', 'reviewDetail']],
    ['draft', 'reputationSource', ['inbox', 'reviewDetail']],
    ['tema', 'reputationSource', ['themeMatrix']],
    ['admin', 'adminSource', ['overview']],
  ])('screen %s surfaces a failure as an error state, not silence', async (id, key, methods) => {
    signIn();
    renderScreen(SCREENS.find((s) => s.id === id).path, {
      [key]: failing(shared[key], methods),
    });

    const alerts = await screen.findAllByRole('alert');

    expect(alerts.length, `${id} swallowed the failure`).toBeGreaterThan(0);
    expect(within(alerts[0]).getByText('Sumber data gagal.')).toBeInTheDocument();
    expect(alerts[0].closest('.panel')).toHaveAttribute('data-status', PANEL_STATUS.ERROR);
  });

  it('uses the guideline copy for the empty state', async () => {
    signIn();

    renderScreen('/review', {
      reputationSource: { ...shared.reputationSource, inbox: async () => ({ counts: {}, rows: [] }) },
    });

    expect(await screen.findByText('Tidak ada review baru')).toBeInTheDocument();
    expect(screen.getByText(/Agen akan memeriksa lagi malam ini pukul 23\.00\./)).toBeInTheDocument();
  });

  it('separates needs-permission from error', async () => {
    // Nothing is broken here: the account simply has no tenant granted, which
    // is a different thing to say and a different thing to do about it.
    const denied = {
      ...shared.sessionSource,
      loadSession: async () => {
        const error = new Error('Akun ini belum diberi akses tenant mana pun.');
        error.code = 'TENANT_FORBIDDEN';
        throw error;
      },
    };

    renderScreen('/masuk', { sessionSource: denied });

    // The screen shows its own actionable copy rather than the raw exception
    // text — a permission gap is something the reader can do something about.
    const message = await screen.findByText('Akun ini belum diberi akses tenant');
    const panel = message.closest('.panel');

    expect(panel).toHaveAttribute('data-status', PANEL_STATUS.NEEDS_PERMISSION);
    expect(within(panel).getByText(/Hubungi admin organisasi Anda/)).toBeInTheDocument();
    expect(within(panel).queryByRole('alert')).toBeNull();
  });

  it('shows a loading state before any source resolves', async () => {
    signIn();
    const pending = new Promise(() => {});

    renderScreen('/briefing', {
      briefingSource: { ...shared.briefingSource, briefing: () => pending },
    });

    const status = await screen.findByRole('status');

    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status.textContent).toMatch(/Agen sedang/);
  });

  it('keeps the theme matrix inside a panel that declares its state', async () => {
    signIn();
    renderScreen('/tema');

    const table = await screen.findByRole('table');

    expect(table.closest('.panel')).toHaveAttribute('data-status', PANEL_STATUS.READY);
  });
});
