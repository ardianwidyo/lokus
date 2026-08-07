import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededAgentSource } from '../src/data/agentSource.js';
import { createDemoWorkspace } from '../src/data/demoWorkspace.js';
import { createSeededKnowledgeSource } from '../src/data/knowledgeSource.js';
import { createSeededReputationSource } from '../src/data/reputationSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

/**
 * US-10 — the console can be given something it has never seen.
 *
 * The screen tests below drive the upload card; the source tests drive the
 * workspace directly, because the claim that matters is not "the table gained a
 * row" but "an agent built before the document existed can now cite it", and
 * that is a statement about wiring rather than about markup.
 */

const TENANT = 'nusa-retail';

/**
 * A clause whose vocabulary appears nowhere in the seeded corpus, so a citation
 * of it cannot be a seeded passage matching by accident.
 */
const LOYALTY_SOP = [
  'Poin loyalitas kartu member berlaku 12 bulan sejak transaksi terakhir.',
  'Kasir wajib memberitahu pelanggan sisa masa berlaku poin loyalitas ketika kartu member dipindai.',
  'Poin loyalitas yang kedaluwarsa tidak bisa dipulihkan oleh kasir maupun manajer toko.',
].join(' ');

const LOYALTY_QUESTION = 'Apa aturan SOP soal masa berlaku poin loyalitas kartu member?';

const signIn = (role = 'manager') =>
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: TENANT, name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );

const renderKb = async ({ role = 'manager' } = {}) => {
  signIn(role);
  window.history.pushState({}, '', '/pengetahuan');
  // No injected knowledge source: the point is the workspace SessionContext
  // builds, which is what carries a document to the other screens.
  const utils = render(<App sessionSource={createSeededSessionSource()} />);
  await screen.findByText(/Dokumen terindeks/, {}, { timeout: 6000 });
  return utils;
};

/**
 * Pasted rather than typed. `user.type` dispatches a keystroke per character,
 * which for a three-clause SOP is thousands of React renders and a test that
 * times out describing nothing about the product.
 */
const fillDocument = async (user, { title, text }) => {
  await user.click(screen.getByLabelText('Judul dokumen'));
  await user.paste(title);
  await user.click(screen.getByLabelText('Isi dokumen'));
  await user.paste(text);
};

describe('Screen 11 · uploading a SOP actually indexes it (T067)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('indexes a pasted document and reports its chunk count (AC-10.1)', { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    await renderKb();

    await fillDocument(user, { title: 'SOP Poin Loyalitas v1', text: LOYALTY_SOP });
    await user.click(screen.getByRole('button', { name: 'Indeks dokumen' }));

    // Found by its own sentence rather than by role: the gap panel on this
    // screen announces a receipt too, and two live regions make role=status
    // ambiguous.
    const receipt = await screen.findByText(/Agen bisa mengutipnya sekarang/, {}, { timeout: 6000 });
    expect(receipt).toHaveAttribute('role', 'status');
    expect(receipt).toHaveTextContent(/SOP Poin Loyalitas v1.*terindeks/);
    // The count comes from the chunker, so the receipt cannot claim an index
    // that did not happen.
    expect(receipt).toHaveTextContent(/\d+ potongan/);
  });

  it('shows the new document in the table without a reload (AC-10.1)', { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    await renderKb();

    await fillDocument(user, { title: 'SOP Poin Loyalitas v1', text: LOYALTY_SOP });
    await user.click(screen.getByRole('button', { name: 'Indeks dokumen' }));

    const row = await screen.findByRole('row', { name: /SOP Poin Loyalitas v1/ }, { timeout: 6000 });
    expect(within(row).getByText('Terindeks')).toBeInTheDocument();
  });

  it('stores a restricted document without indexing it (AC-10.3)', { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    await renderKb();

    await fillDocument(user, { title: 'Kontrak Vendor Rahasia', text: LOYALTY_SOP });
    await user.click(screen.getByLabelText(/Batasi akses ke peran Admin/));
    await user.click(screen.getByRole('button', { name: 'Indeks dokumen' }));

    const receipt = await screen.findByText(
      /Agen tidak akan mengutipnya sampai ditinjau/,
      {},
      { timeout: 6000 },
    );
    expect(receipt).toHaveTextContent(/tidak diindeks/);

    const row = await screen.findByRole('row', { name: /Kontrak Vendor Rahasia/ });
    expect(within(row).getByText('Menunggu tinjauan')).toBeInTheDocument();
  });

  it('refuses a file it cannot read rather than indexing mojibake', { timeout: 20000 }, async () => {
    await renderKb();

    // Dropped rather than picked: `user.upload` filters by the input's
    // `accept` attribute and would never deliver the file, so it would assert
    // the browser's guard instead of ours. A drag-and-drop bypasses `accept`
    // entirely, which is exactly the case worth defending.
    const file = new File(['%PDF-1.7 binary'], 'sop.pdf', { type: 'application/pdf' });
    fireEvent.drop(screen.getByText(/Tarik berkas/).closest('label'), {
      dataTransfer: { files: [file] },
    });

    const alert = await screen.findByRole('alert', {}, { timeout: 6000 });
    expect(alert).toHaveTextContent(/hanya bisa membaca berkas teks/i);
  });

  it('does not let a viewer add a document (AC-6.3)', async () => {
    await renderKb({ role: 'viewer' });

    expect(screen.getByLabelText('Judul dokumen')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Indeks dokumen' })).toBeDisabled();
    expect(screen.getByText(/Peran Anda hanya bisa membaca/)).toBeInTheDocument();
  });
});

describe('One workspace, so a new document reaches the agents (T066, AC-10.2)', () => {
  /** The wiring SessionContext performs, without the fourteen screens on top. */
  const wire = () => {
    const workspace = createDemoWorkspace({ tenantId: TENANT });
    return {
      workspace,
      knowledge: createSeededKnowledgeSource({ tenantId: TENANT, store: workspace.knowledgeStore }),
      // Built *before* the document exists, exactly as the console builds it.
      agent: createSeededAgentSource({
        tenantId: TENANT,
        gbp: workspace.gbp,
        passages: workspace.passages,
      }),
      reputation: createSeededReputationSource({
        tenantId: TENANT,
        gbp: workspace.gbp,
        passages: workspace.passages,
        approvalStore: workspace.approvalStore,
      }),
    };
  };

  it('refuses the question before the document exists, and cites it after', async () => {
    const { knowledge, agent } = wire();

    const before = await agent.ask(LOYALTY_QUESTION);
    expect(before.sourceSummary).toHaveLength(0);

    await knowledge.ingest(TENANT, { title: 'SOP Poin Loyalitas v1', text: LOYALTY_SOP });

    // Same agent instance. Before T066 this still answered from the frozen seed
    // corpus and refused, which is the defect the workspace exists to fix.
    const after = await agent.ask(LOYALTY_QUESTION);
    expect(after.sourceSummary.length).toBeGreaterThan(0);
    expect(after.answer).toMatch(/poin loyalitas/i);
  });

  it('never lets a restricted document reach an agent (AC-10.3)', async () => {
    const { knowledge, agent } = wire();

    await knowledge.ingest(TENANT, {
      title: 'Kontrak Vendor Rahasia',
      text: LOYALTY_SOP,
      restricted: true,
    });

    const run = await agent.ask(LOYALTY_QUESTION);
    expect(run.sourceSummary).toHaveLength(0);
  });

  it('puts an added review in the inbox and drafts a reply for it (AC-10.4)', async () => {
    const { reputation } = wire();
    const before = await reputation.inbox({ bucket: 'perlu-tindakan' });

    const review = await reputation.addReview({
      outletId: 'BKS-02',
      rating: 2,
      author: 'Juri EBCO',
      text: 'Antre 20 menit di kasir, cuma satu yang buka padahal ramai sekali.',
    });

    const after = await reputation.inbox({ bucket: 'perlu-tindakan' });
    expect(after.counts['perlu-tindakan']).toBe(before.counts['perlu-tindakan'] + 1);
    expect(after.rows.some((row) => row.id === review.id)).toBe(true);

    const detail = await reputation.reviewDetail(review.id);
    expect(detail.draft.drafted).toBe(true);
    // Grounded in the corpus like any other draft, not exempted from the rule.
    expect(detail.draft.citations.length).toBeGreaterThan(0);
  });

  it('clusters an added review into the theme its text describes (AC-10.4)', async () => {
    const { reputation } = wire();
    const before = await reputation.themeMatrix();
    const beforeCount =
      before.themes.find((theme) => theme.theme === 'antrean-kasir')?.byOutlet?.['BGR-01'] ?? 0;

    await reputation.addReview({
      outletId: 'BGR-01',
      rating: 1,
      author: 'Juri EBCO',
      text: 'Antrean kasir mengular sampai luar toko, kasir yang buka cuma satu.',
    });

    const after = await reputation.themeMatrix();
    const afterCount = after.themes.find((theme) => theme.theme === 'antrean-kasir').byOutlet['BGR-01'];
    // Rediscovered from the text; nothing told the clusterer which theme it was.
    expect(afterCount).toBe(beforeCount + 1);
  });
});
