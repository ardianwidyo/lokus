import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

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

const renderDraft = async ({ role = 'manager', url = '/draft', source = null } = {}) => {
  signedInAs(role);
  window.history.pushState({}, '', url);
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      reputationSource={source ?? createSeededReputationSource()}
    />,
  );
  await screen.findByText(/Terima kasih sudah memberi tahu|Tidak ada di dokumen|Tidak ada draft/);
  return utils;
};

describe('Screen 06 · Draft balasan AI', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('opens the first review awaiting a human when none is named', async () => {
    await renderDraft();

    // The branch name appears in the review meta and again inside the draft.
    expect(screen.getAllByText(/Bekasi Timur/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Antre 25 menit/)).toBeInTheDocument();
  });

  it('opens the review named in the URL, so a draft is shareable', async () => {
    await renderDraft({ url: '/draft?review=rev-DPK-01-featured-1' });

    expect(screen.getAllByText(/Depok Margonda/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Stok minuman dingin kosong/)).toBeInTheDocument();
  });

  it('shows each cited SOP passage with its page, score and quote (AC-3.2)', async () => {
    await renderDraft();

    const sop = screen.getByText(/SOP Layanan Pelanggan v4 · hal\. 12/);
    const card = sop.closest('.source-card');

    // Indonesian decimal comma — since US-8 this figure goes through the
    // locale-aware formatter rather than a raw `.toFixed(2)`.
    expect(within(card).getByText(/skor 1,00|skor 0,\d\d/)).toBeInTheDocument();
    expect(within(card).getByText(/kasir tambahan/)).toBeInTheDocument();
  });

  it('lists all four guardrail checks with their verdicts (AC-3.4)', async () => {
    await renderDraft();

    for (const label of [
      'Tanpa klaim tak bersumber',
      'Tanpa data pribadi',
      'Nada sesuai panduan',
      'Tanpa janji kompensasi',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getAllByText('lolos')).toHaveLength(4);
  });

  it('states that nothing is sent without human approval', async () => {
    await renderDraft();

    expect(screen.getByText(/Persetujuan manusia wajib untuk semua review bintang 1–2/)).toBeInTheDocument();
  });

  it('sends the reply and reports that the approver was recorded (AC-3.1)', async () => {
    await renderDraft();

    await userEvent.click(screen.getByRole('button', { name: 'Setujui & kirim' }));

    expect(await screen.findByText(/Penyetuju dan waktunya tercatat/)).toBeInTheDocument();
  });

  it('disables every action for a viewer (AC-6.3)', async () => {
    await renderDraft({ role: 'viewer' });

    expect(screen.getByRole('button', { name: 'Setujui & kirim' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Minta versi lain' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tolak' })).toBeDisabled();
  });

  it('shows the refusal, and nothing to cite, when the agent declined to draft', async () => {
    const source = createSeededReputationSource();
    const original = source.reviewDetail;
    source.reviewDetail = async (id) => ({
      ...(await original(id)),
      draft: { drafted: false, reason: 'Tidak ada pasal SOP di atas ambang 0.7.' },
      guardrail: null,
    });

    await renderDraft({ source });

    expect(screen.getByText('Tidak ada di dokumen.')).toBeInTheDocument();
    expect(screen.getByText(/tidak bersandar pada dokumen mana pun/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Setujui & kirim' })).toBeDisabled();
  });

  it('navigates back to the inbox', async () => {
    await renderDraft();

    await userEvent.click(screen.getByRole('button', { name: /Kembali ke kotak masuk/ }));

    await waitFor(() => expect(window.location.pathname).toBe('/review'));
  });

  it('is reachable from the inbox with the selected review carried along', async () => {
    signedInAs('manager');
    window.history.pushState({}, '', '/review');
    render(
      <App sessionSource={createSeededSessionSource()} reputationSource={createSeededReputationSource()} />,
    );
    await screen.findByRole('listbox', { name: 'Daftar review' });
    // The preview panel loads its draft separately; wait for it before acting.
    await screen.findByRole('button', { name: 'Ubah teks' });

    await userEvent.click(screen.getByRole('button', { name: 'Ubah teks' }));

    await waitFor(() => expect(window.location.pathname).toBe('/draft'));
    expect(window.location.search).toMatch(/^\?review=rev-/);
  });

  it('shows the error state with a retry when the draft cannot load', async () => {
    const source = createSeededReputationSource();
    source.inbox = async () => {
      throw new Error('Layanan draft tidak menjawab.');
    };

    signedInAs('manager');
    window.history.pushState({}, '', '/draft');
    render(<App sessionSource={createSeededSessionSource()} reputationSource={source} />);

    const title = await screen.findByText('Draft tak bisa dimuat');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
  });
});
