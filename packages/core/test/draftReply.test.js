import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { addressFor, draftReply } from '../src/reputation/draftReply.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';

const TENANT = 'nusa-retail';

const reviewById = async (id) => {
  const { data } = await createSeededGbpAdapter().listReviews({ tenantId: TENANT, limit: 5000 });
  return data.reviews.find((review) => review.id === id);
};

describe('draftReply (AC-3.2)', () => {
  it('drafts a reply grounded in the SOP clause it retrieved', async () => {
    const review = await reviewById('rev-BKS-02-featured-1');

    const { data, sources } = await draftReply({ tenantId: TENANT, review });

    expect(data.drafted).toBe(true);
    expect(data.text).toMatch(/Terima kasih sudah memberi tahu/);
    expect(data.text).toMatch(/10 menit/);
    expect(data.text).toMatch(/Bekasi Timur/);
    expect(sources.length).toBeGreaterThan(0);
  });

  it('cites the SOP page it used, with a score and a quote', async () => {
    const review = await reviewById('rev-BKS-02-featured-1');

    const { data } = await draftReply({ tenantId: TENANT, review });
    const sop = data.citations.find((citation) => citation.docId === 'sop-layanan-v4');

    expect(sop.page).toBe(12);
    expect(sop.score).toBeGreaterThanOrEqual(0.7);
    expect(sop.quote).toMatch(/kasir tambahan/);
  });

  it('also cites the brand-voice rule that governs how it is phrased', async () => {
    const review = await reviewById('rev-BKS-02-featured-1');

    const { data } = await draftReply({ tenantId: TENANT, review });

    expect(data.citations.some((citation) => citation.docId === 'nada-brand-2026')).toBe(true);
  });

  it('never promises compensation (AC-3.3)', async () => {
    const { data } = await createSeededGbpAdapter().listReviews({ tenantId: TENANT, limit: 5000 });

    for (const review of data.reviews.filter((r) => r.rating <= 3).slice(0, 60)) {
      const draft = await draftReply({ tenantId: TENANT, review });
      if (!draft.data.drafted) continue;

      expect(draft.data.text).not.toMatch(/voucher|ganti rugi|kompensasi|potongan harga|uang kembali/i);
    }
  });

  it('marks a 1-2 star draft as needing approval (AC-3.1)', async () => {
    const oneStar = await reviewById('rev-BKS-02-featured-1');
    const threeStar = await reviewById('rev-SRP-03-featured-1');

    const low = await draftReply({ tenantId: TENANT, review: oneStar });
    const mid = await draftReply({ tenantId: TENANT, review: threeStar });

    expect(low.data.requiresApproval).toBe(true);
    expect(mid.data.requiresApproval).toBe(false);
  });

  it('refuses instead of inventing when nothing clears the confidence floor', async () => {
    const review = await reviewById('rev-BKS-02-featured-1');

    // An empty corpus: retrieval can ground nothing.
    const { data, sources } = await draftReply({ tenantId: TENANT, review, passages: [] });

    expect(data.drafted).toBe(false);
    expect(data.text).toBeNull();
    expect(data.refusal).toBe('tidak ada di dokumen');
    expect(sources).toEqual([]);
  });

  it('logs a knowledge gap when it refuses, so the gap can be closed', async () => {
    const review = await reviewById('rev-BKS-02-featured-1');

    const { data } = await draftReply({ tenantId: TENANT, review, passages: [] });

    expect(data.knowledgeGap).toMatchObject({ tenantId: TENANT, reviewId: review.id });
  });

  it('refuses when the review carries no recognisable complaint', async () => {
    const { data } = await draftReply({
      tenantId: TENANT,
      review: {
        id: 'x',
        tenantId: TENANT,
        outletId: 'BKS-02',
        rating: 3,
        author: 'Tono',
        text: 'Begitulah adanya.',
      },
    });

    expect(data.drafted).toBe(false);
    expect(data.reason).toMatch(/tidak dikenali/);
  });

  it('returns the prompt it would send, so the ask is auditable next to the answer', async () => {
    const review = await reviewById('rev-BKS-02-featured-1');

    const { data } = await draftReply({ tenantId: TENANT, review });

    expect(data.prompt).toMatch(/Jangan pernah menjanjikan kompensasi/);
    expect(data.prompt).toMatch(/sop-layanan-v4 hal\. 12/);
  });

  it('drafts a distinct, on-theme reply for each complaint type', async () => {
    const ids = [
      ['rev-DPK-01-featured-1', /rak utama|restock/],
      ['rev-CKR-01-featured-1', /kebersihan|dibersihkan/],
      ['rev-SRP-03-featured-1', /parkir/],
      ['rev-TGR-01-featured-1', /harga|promo/],
    ];

    for (const [id, pattern] of ids) {
      const { data } = await draftReply({ tenantId: TENANT, review: await reviewById(id) });

      expect(data.drafted, id).toBe(true);
      expect(data.text, id).toMatch(pattern);
    }
  });

  it('refuses a review from another tenant and a call with no tenant', async () => {
    const review = await reviewById('rev-BKS-02-featured-1');

    await expect(draftReply({ tenantId: 'klinik-sehat-prima', review })).rejects.toThrow(
      /tidak ditemukan/,
    );
    await expect(draftReply({ review })).rejects.toBeInstanceOf(TenantScopeError);
  });
});

describe('addressFor', () => {
  it('uses the first name with a neutral Indonesian honorific', () => {
    expect(addressFor('Ratna W.')).toMatchObject({ name: 'Ratna', salutation: 'Kak' });
  });

  it('falls back cleanly when the author is unknown', () => {
    expect(addressFor(null).name).toBeNull();
    expect(addressFor('   ').name).toBeNull();
  });
});
