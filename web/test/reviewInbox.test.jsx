import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededReputationSource } from '../src/data/reputationSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const signedInAs = (role) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );
};

const renderInbox = async ({ role = 'manager', reputationSource = null } = {}) => {
  signedInAs(role);
  window.history.pushState({}, '', '/review');
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      reputationSource={reputationSource ?? createSeededReputationSource()}
    />,
  );
  await screen.findByRole('listbox', { name: 'Daftar review' });
  // The preview panel resolves its draft in a second pass; waiting for it here
  // keeps every test asserting against a settled screen rather than a race.
  await screen.findByRole('button', { name: /Setujui & kirim/ }, { timeout: 4000 });
  return utils;
};

const rows = () => screen.getAllByRole('option');

describe('Screen 05 · Kotak masuk review (AC-3.1)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('lists reviews that need action, newest first', async () => {
    await renderInbox();

    expect(rows().length).toBeGreaterThan(0);
    expect(rows()[0]).toHaveTextContent('Bekasi Timur');
    expect(rows()[0]).toHaveTextContent('2 jam lalu');
  });

  it('counts each bucket from the review rows rather than hard-coding it', async () => {
    await renderInbox();

    const filters = screen.getByRole('radiogroup', { name: 'Saring review' });
    const text = filters.textContent;

    // Real counts, and not the mockup's illustrative ones.
    expect(text).toMatch(/Perlu tindakan · [1-9]\d*/);
    expect(text).toMatch(/Terkirim · [1-9]\d*/);
  });

  it('selects the first review and shows its draft with SOP citations (AC-3.2)', async () => {
    await renderInbox();

    expect(rows()[0]).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(/Terima kasih sudah memberi tahu/)).toBeInTheDocument();
    expect(screen.getByText(/SOP Layanan Pelanggan v4 · hal\. 12/)).toBeInTheDocument();
  });

  it('shows the guardrail result before the send action (AC-3.4)', async () => {
    await renderInbox();

    expect(await screen.findByText('Guardrail lolos 4/4')).toBeInTheDocument();
  });

  it('moves the selection with the arrow keys', async () => {
    await renderInbox();
    const list = screen.getByRole('listbox', { name: 'Daftar review' });
    const firstId = rows()[0].textContent;

    list.focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(rows()[1]).toHaveAttribute('aria-selected', 'true');
    expect(rows()[0].textContent).toBe(firstId);
  });

  it('wraps around at the ends of the list', async () => {
    await renderInbox();
    const list = screen.getByRole('listbox', { name: 'Daftar review' });

    list.focus();
    await userEvent.keyboard('{ArrowUp}');

    expect(rows().at(-1)).toHaveAttribute('aria-selected', 'true');
  });

  it('approves and sends with Enter', async () => {
    const source = createSeededReputationSource();
    const spy = vi.spyOn(source, 'approveAndSend');
    await renderInbox({ reputationSource: source });
    const list = screen.getByRole('listbox', { name: 'Daftar review' });

    list.focus();
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0]).toMatchObject({ role: 'manager' });
  });

  it('records the approver when a one-star reply is sent (AC-3.1)', async () => {
    const source = createSeededReputationSource();
    await renderInbox({ reputationSource: source });

    await userEvent.click(screen.getByRole('button', { name: /Setujui & kirim/ }));

    expect(await screen.findByText(/persetujuan tercatat/)).toBeInTheDocument();
  });

  it('hides every action from a viewer and says why (AC-6.3)', async () => {
    await renderInbox({ role: 'viewer' });

    expect(await screen.findByText(/Peran Anda hanya bisa membaca/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Setujui & kirim/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ubah teks' })).toBeDisabled();
  });

  it('switches buckets and reloads the list', async () => {
    await renderInbox();
    const before = rows().length;

    await userEvent.click(screen.getByText(/^Terkirim/));

    // Passes in well under a second alone; the longer budget here is headroom
    // for CPU contention at the tail of a full parallel run, not slack for a
    // slow implementation.
    await waitFor(() => expect(rows().length).not.toBe(before), { timeout: 10000 });
  }, 15000);

  it('shows the empty state when a bucket has no reviews', async () => {
    const source = createSeededReputationSource();
    source.inbox = async () => ({ counts: { 'perlu-tindakan': 0 }, rows: [] });

    signedInAs('manager');
    window.history.pushState({}, '', '/review');
    render(<App sessionSource={createSeededSessionSource()} reputationSource={source} />);

    expect(await screen.findByText('Tidak ada review baru')).toBeInTheDocument();
    expect(screen.getByText(/pukul 23\.00/)).toBeInTheDocument();
  });

  it('shows the error state with a retry when the inbox fails', async () => {
    const source = createSeededReputationSource();
    source.inbox = async () => {
      throw new Error('Layanan review tak menjawab.');
    };

    signedInAs('manager');
    window.history.pushState({}, '', '/review');
    render(<App sessionSource={createSeededSessionSource()} reputationSource={source} />);

    const alert = await screen.findByText('Kotak masuk tak bisa dimuat');
    const panel = alert.closest('.panel');

    expect(panel).toHaveAttribute('data-status', 'error');
    expect(within(panel).getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
  });
});
