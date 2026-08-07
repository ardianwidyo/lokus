import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('Screen 11 · reading a document back (T069)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  const openDocument = async (user, title) =>
    user.click(await screen.findByRole('button', { name: title }, { timeout: 6000 }));

  it('says nothing is open before a document is chosen', async () => {
    await renderKb();

    const empty = screen.getByText('Belum ada dokumen dibuka');
    expect(empty.closest('.panel')).toHaveAttribute('data-status', 'empty');
  });

  it('opens a seeded document onto the chunks indexed from it (AC-10.8)', { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    await renderKb();

    await openDocument(user, 'SOP Layanan Pelanggan v4');

    // The passage as stored, not a summary of it — this panel exists so a
    // reader can check what retrieval actually has to work with.
    expect(
      await screen.findByText(/Antrean lebih dari 10 menit wajib ditangani/, {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    // Page and token count come off the chunk, so the panel cannot claim a
    // position the chunker never recorded.
    expect(screen.getAllByText(/hal\. \d+ · \d+ token/).length).toBeGreaterThan(0);
  });

  it('opens a document added this session onto the text that was pasted', { timeout: 25000 }, async () => {
    const user = userEvent.setup();
    await renderKb();

    await fillDocument(user, { title: 'SOP Poin Loyalitas v1', text: LOYALTY_SOP });
    await user.click(screen.getByRole('button', { name: 'Indeks dokumen' }));
    await screen.findByText(/Agen bisa mengutipnya sekarang/, {}, { timeout: 8000 });

    await openDocument(user, 'SOP Poin Loyalitas v1');

    expect(
      await screen.findByText(/Poin loyalitas kartu member berlaku 12 bulan/, {}, { timeout: 6000 }),
    ).toBeInTheDocument();
  });

  it('marks a document added this session as demo data in the table (AC-10.6)', { timeout: 25000 }, async () => {
    const user = userEvent.setup();
    await renderKb();

    await fillDocument(user, { title: 'SOP Poin Loyalitas v1', text: LOYALTY_SOP });
    await user.click(screen.getByRole('button', { name: 'Indeks dokumen' }));

    const added = await screen.findByRole('row', { name: /SOP Poin Loyalitas v1/ }, { timeout: 8000 });
    expect(within(added).getByText('demo')).toBeInTheDocument();
    // The tenant's own SOP must not pick the mark up by association.
    const seeded = screen.getByRole('row', { name: /SOP Layanan Pelanggan v4/ });
    expect(within(seeded).queryByText('demo')).toBeNull();
  });

  it('holds a restricted document back from a manager, naming it (AC-10.9)', { timeout: 25000 }, async () => {
    const user = userEvent.setup();
    await renderKb();

    await fillDocument(user, { title: 'Kontrak Vendor Rahasia', text: LOYALTY_SOP });
    await user.click(screen.getByLabelText(/Batasi akses ke peran Admin/));
    await user.click(screen.getByRole('button', { name: 'Indeks dokumen' }));
    await screen.findByText(/Agen tidak akan mengutipnya sampai ditinjau/, {}, { timeout: 8000 });

    await openDocument(user, 'Kontrak Vendor Rahasia');

    const refusal = await screen.findByText(
      /"Kontrak Vendor Rahasia" ditandai hanya untuk peran Admin/,
      {},
      { timeout: 6000 },
    );
    // Needs-permission, not error: nothing is broken, someone decided this.
    expect(refusal.closest('.panel')).toHaveAttribute('data-status', 'needs-permission');
    expect(screen.queryByText(/Poin loyalitas kartu member berlaku/)).toBeNull();
  });

  it('shows a restricted document to an admin, still marked unretrievable (AC-10.9)', { timeout: 25000 }, async () => {
    const user = userEvent.setup();
    await renderKb({ role: 'admin' });

    await fillDocument(user, { title: 'Kontrak Vendor Rahasia', text: LOYALTY_SOP });
    await user.click(screen.getByLabelText(/Batasi akses ke peran Admin/));
    await user.click(screen.getByRole('button', { name: 'Indeks dokumen' }));
    await screen.findByText(/Agen tidak akan mengutipnya sampai ditinjau/, {}, { timeout: 8000 });

    await openDocument(user, 'Kontrak Vendor Rahasia');

    expect(
      await screen.findByText(/Poin loyalitas kartu member berlaku 12 bulan/, {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    // Readable by an admin and still outside retrieval — two different things,
    // and the panel says so rather than letting the reader assume.
    expect(screen.getByText(/tersimpan tapi tidak diindeks untuk pencarian/)).toBeInTheDocument();
  });
});

describe('Screen 05 · the review composer (T068)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  const renderInbox = async () => {
    signIn();
    window.history.pushState({}, '', '/review');
    // No injected reputation source: the composer writes into the workspace
    // SessionContext builds, which is what the rest of the console reads.
    const utils = render(<App sessionSource={createSeededSessionSource()} />);
    await screen.findByRole('listbox', {}, { timeout: 6000 });
    await userEvent.setup().click(screen.getByRole('button', { name: /Tambah review/ }));
    return utils;
  };

  const compose = async (user, { outlet, rating, text }) => {
    await user.selectOptions(screen.getByLabelText('Cabang'), outlet);
    await user.selectOptions(screen.getByLabelText('Bintang'), String(rating));
    await user.click(screen.getByLabelText('Teks review'));
    await user.paste(text);
    await user.click(screen.getByRole('button', { name: 'Tambahkan' }));
  };

  it('adds a review and selects it, drafted and ready (AC-10.4)', { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    await renderInbox();

    await compose(user, {
      outlet: 'BKS-02',
      rating: 2,
      text: 'Antre 20 menit di kasir, cuma satu yang buka padahal ramai sekali.',
    });

    const receipt = await screen.findByText(/Draft balasannya sudah dibuat/, {}, { timeout: 8000 });
    expect(receipt).toBeInTheDocument();

    // Twice: the list row, and the preview panel that followed it. The preview
    // moving on its own is the point — a presenter should not have to hunt for
    // what they just typed.
    await waitFor(() =>
      expect(screen.getAllByText(/Antre 20 menit di kasir/)).toHaveLength(2),
    );
    // Drafted, and therefore sendable — the added row is not a second-class one.
    expect(screen.getByRole('button', { name: /Setujui & kirim/ })).toBeEnabled();
  });

  it('never presents an added review as a Google one (AC-10.6)', { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    await renderInbox();

    await compose(user, {
      outlet: 'BKS-02',
      rating: 2,
      text: 'Kasir cuma satu yang buka dan antreannya panjang sekali.',
    });

    await screen.findByText(/Draft balasannya sudah dibuat/, {}, { timeout: 8000 });
    expect(await screen.findByText(/Ditambahkan di demo/)).toBeInTheDocument();
    expect(screen.getAllByText('demo').length).toBeGreaterThan(0);
  });

  it('refuses a branch with no Google listing, in the console’s own words', { timeout: 20000 }, async () => {
    const user = userEvent.setup();
    await renderInbox();

    await compose(user, {
      outlet: 'BSD-02',
      rating: 4,
      text: 'Cabang baru yang rapi dan kasirnya cepat.',
    });

    const alert = await screen.findByRole('alert', {}, { timeout: 8000 });
    expect(alert).toHaveTextContent(/belum punya listing di Google Maps/);
  });

  it('offers the added filter at zero, and says what it is for (AC-10.10)', { timeout: 20000 }, async () => {
    await renderInbox();

    // Present before anything has been added: zero is the true answer to "what
    // have I put in", and a segment that appears only afterwards hides it.
    const filter = screen.getByRole('radio', { name: /Ditambahkan \(demo\) · 0/ });
    await userEvent.setup().click(filter);

    expect(await screen.findByText('Belum ada review yang Anda tambahkan')).toBeInTheDocument();
    expect(screen.getByText(/hanya berisi review yang ditulis lewat komposer/)).toBeInTheDocument();
  });

  it('lists exactly the reviews added this session (AC-10.10)', { timeout: 25000 }, async () => {
    const user = userEvent.setup();
    await renderInbox();

    await compose(user, {
      outlet: 'BKS-02',
      rating: 2,
      text: 'Antre 20 menit di kasir, cuma satu yang buka padahal ramai sekali.',
    });
    await screen.findByText(/Draft balasannya sudah dibuat/, {}, { timeout: 8000 });

    await user.click(await screen.findByRole('radio', { name: /Ditambahkan \(demo\) · 1/ }));

    const list = await screen.findByRole('listbox', {}, { timeout: 8000 });
    const rows = within(list).getAllByRole('option');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent(/Antre 20 menit di kasir/);
    // Origin, not workflow stage: the same review is still in the stage it
    // reached rather than having been moved out of it.
    await user.click(screen.getByRole('radio', { name: /Perlu tindakan/ }));
    const stage = await screen.findByRole('listbox', {}, { timeout: 8000 });
    await waitFor(() =>
      expect(
        within(stage)
          .getAllByRole('option')
          .some((row) => row.textContent.includes('Antre 20 menit di kasir')),
      ).toBe(true),
    );
  });
});
