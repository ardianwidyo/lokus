import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededAdminSource } from '../src/data/adminSource.js';
import { createSeededOutletSource } from '../src/data/outletSource.js';
import { createSeededReputationSource } from '../src/data/reputationSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

/**
 * Spec US-9 in the console.
 *
 * The behaviour under test is what the reader is *not* offered: no send button
 * where there is no authority to send, and no connect button where connecting
 * cannot help. Both are easy to get subtly wrong in a way tests over the happy
 * path never notice, which is why they are pinned here.
 */

const signedInAs = (role = 'manager') => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({
      tenantId: 'nusa-retail',
      name: 'Nusa Retail',
      outletCount: 42,
      area: 'Jabodetabek',
      role,
    }),
  );
};

const renderInbox = async (role = 'manager') => {
  signedInAs(role);
  window.history.pushState({}, '', '/review');
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      reputationSource={createSeededReputationSource()}
    />,
  );
  await screen.findByRole('listbox', { name: 'Daftar review' });
  return utils;
};

const renderOutlet = async (outlet) => {
  signedInAs();
  window.history.pushState({}, '', `/cabang?outlet=${outlet}`);
  const utils = render(
    <App sessionSource={createSeededSessionSource()} outletSource={createSeededOutletSource()} />,
  );
  await screen.findByText(/Manajer:/, {}, { timeout: 4000 });
  return utils;
};

/** The first row for a branch. Several of its reviews are in the queue. */
const selectRowFor = async (branch) => {
  await screen.findAllByRole('option', { name: branch }, { timeout: 4000 });
  const [row] = screen.getAllByRole('option', { name: branch });
  await userEvent.click(row);
  return row;
};

const selectKarawang = () => selectRowFor(/Karawang Galuh Mas/);

describe('Screen 05 · an unclaimed listing (AC-9.3, AC-9.4)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('lists the Karawang complaints, because they are readable', async () => {
    await renderInbox();

    expect(
      screen.getAllByRole('option').some((row) => row.textContent.includes('Karawang Galuh Mas')),
    ).toBe(true);
  });

  it('offers no reply for it, and says why in the permission state', async () => {
    await renderInbox();
    await selectKarawang();

    const preview = document.querySelector('.inbox-preview-panel');
    expect(await within(preview).findByText(/Listing belum diklaim akun ini/)).toBeInTheDocument();
    // The send is absent, not disabled: a greyed button implies a permission a
    // manager might think they could obtain by asking someone in this tenant.
    expect(within(preview).queryByRole('button', { name: /Setujui & kirim/ })).toBeNull();
  });

  it('offers the connect action, because a person can act on this one', async () => {
    await renderInbox();
    await selectKarawang();

    const preview = document.querySelector('.inbox-preview-panel');
    expect(
      within(preview).getByRole('button', { name: 'Hubungkan listing' }),
    ).toBeInTheDocument();
  });

  it('withholds the connect action from a viewer, who cannot grant anything', async () => {
    await renderInbox('viewer');
    await selectKarawang();

    const preview = document.querySelector('.inbox-preview-panel');
    expect(within(preview).queryByRole('button', { name: 'Hubungkan listing' })).toBeNull();
    // The permission state still explains itself — a viewer who cannot connect
    // is told to ask an admin, not shown a panel that has simply gone quiet.
    expect(
      within(preview).getByText(/Minta admin tenant untuk menghubungkan akun/),
    ).toBeInTheDocument();
  });

  it('says five is Google’s ceiling, not the branch’s review count (AC-9.6)', async () => {
    await renderInbox();
    await selectKarawang();

    const preview = document.querySelector('.inbox-preview-panel');
    expect(within(preview).getByText(/batas API, bukan jumlah review cabang ini/)).toBeInTheDocument();
  });

  it('says how much of the queue is waiting on a connection rather than a reply', async () => {
    await renderInbox();

    expect(screen.getByText(/menunggu koneksi listing/)).toBeInTheDocument();
  });

  it('still offers the reply on a managed branch, so the gate is the level alone', async () => {
    await renderInbox();

    await selectRowFor(/Bekasi Timur/);

    const preview = document.querySelector('.inbox-preview-panel');
    expect(
      await within(preview).findByRole('button', { name: /Setujui & kirim/ }, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});

describe('Screen 04 · a branch with no listing (AC-9.1, AC-9.3)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('names the level beside the branch it qualifies', async () => {
    await renderOutlet('BSD-02');

    expect(screen.getByText('Tanpa listing')).toBeInTheDocument();
  });

  it('explains the empty rating panel instead of leaving it blank', async () => {
    await renderOutlet('BSD-02');

    // An empty chart with no explanation reads as "no complaints this quarter",
    // which is the opposite of what it means.
    expect(screen.getByText(/belum ada di Google Maps/)).toBeInTheDocument();
    expect(screen.getByText(/Daftarkan BSD Grand Boulevard/)).toBeInTheDocument();
  });

  it('offers no connect button, because connecting cannot create a listing', async () => {
    await renderOutlet('BSD-02');

    expect(screen.queryByRole('button', { name: 'Hubungkan listing' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hubungkan akun' })).toBeNull();
  });

  it('still scores its location, which Places can answer for either way', async () => {
    await renderOutlet('BSD-02');

    expect(screen.getByText(/peringkat \d+ dari 8/)).toBeInTheDocument();
  });

  it('marks a managed branch as managed, so the others read as exceptions', async () => {
    await renderOutlet('BKS-02');

    expect(screen.getByText('Listing dikelola')).toBeInTheDocument();
  });
});

describe('Screen 14 · what the response metrics left out (AC-9.5)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  const renderAdmin = async () => {
    signedInAs('admin');
    window.history.pushState({}, '', '/admin');
    const utils = render(
      <App sessionSource={createSeededSessionSource()} adminSource={createSeededAdminSource()} />,
    );
    await screen.findByText('Cakupan pengukuran respons', {}, { timeout: 4000 });
    return utils;
  };

  it('reports the two response figures over the branches it can vouch for', async () => {
    await renderAdmin();

    expect(screen.getByText('Median respons pertama')).toBeInTheDocument();
    expect(screen.getByText(/Dibalas dalam 48 jam/)).toBeInTheDocument();
    expect(screen.getAllByText(/dari 6 cabang yang riwayatnya utuh/).length).toBeGreaterThan(0);
  });

  it('names the branches it excluded, rather than dropping them quietly', async () => {
    await renderAdmin();

    expect(screen.getByText(/2 cabang tidak dihitung/)).toBeInTheDocument();

    const exclusions = document.querySelector('.coverage-exclusions');
    expect(within(exclusions).getByText('Karawang Galuh Mas')).toBeInTheDocument();
    expect(within(exclusions).getByText('BSD Grand Boulevard')).toBeInTheDocument();
  });
});
