import { describe, expect, it, vi } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { draftReply } from '../src/reputation/draftReply.js';
import { guardrailCheck } from '../src/reputation/guardrails.js';
import { buildReplyPrompt, checkReplyShape, writeReply } from '../src/reputation/writeReply.js';

const TENANT = 'nusa-retail';

const SOP = {
  docId: 'sop-layanan-v4',
  title: 'SOP Layanan Pelanggan v4',
  page: 8,
  score: 0.82,
  text: 'Bila antrean melebihi 5 orang, kasir tambahan wajib dibuka dalam 10 menit.',
};

const REVIEW = { id: 'rev-1', tenantId: TENANT, rating: 2, text: 'Antrean kasir panjang sekali', outletId: 'BKS-02' };

const modelSaying = (text) => ({
  generate: vi.fn(async () => ({
    text,
    model: 'gemini-2.0-flash',
    tier: 'gemini-reasoning',
    tokens: { input: 200, output: 60 },
    costIdr: 0.7,
    ms: 810,
  })),
});

describe('the reply prompt', () => {
  it('gives the model the clause it must act from', () => {
    const prompt = buildReplyPrompt({
      review: REVIEW,
      sopPassage: SOP,
      voicePassage: null,
      outlet: { name: 'Bekasi Timur' },
      address: { salutation: 'Bapak', name: 'Andi' },
    });

    expect(prompt).toContain('kasir tambahan wajib dibuka dalam 10 menit');
    expect(prompt).toContain('Bekasi Timur');
    expect(prompt).toContain('2 bintang');
  });

  it('forbids the promises the guardrail would reject anyway', () => {
    // The model is told the rules the guardrail enforces, so a rejected draft
    // is the exception rather than the routine.
    const prompt = buildReplyPrompt({ review: REVIEW, sopPassage: SOP, outlet: null, address: {} });

    expect(prompt).toMatch(/Jangan menjanjikan tanggal/);
    expect(prompt).toMatch(/Jangan mengarang kebijakan/);
    expect(prompt).toMatch(/data pribadi/);
  });
});

describe('reply shape checks', () => {
  it('rejects citation markers, which belong to the reviewer not the customer', () => {
    const failed = checkReplyShape('Terima kasih. Kasir tambahan dibuka [1].').filter((c) => !c.passed);
    expect(failed.map((c) => c.id)).toContain('no-markers');
  });

  it('rejects a template placeholder that survived', () => {
    const failed = checkReplyShape('Terima kasih {salutation}.').filter((c) => !c.passed);
    expect(failed.map((c) => c.id)).toContain('no-placeholder');
  });

  it('rejects an essay', () => {
    const long = Array.from({ length: 9 }, (_, i) => `Kalimat nomor ${i}.`).join(' ');
    expect(checkReplyShape(long).find((c) => c.id === 'length').passed).toBe(false);
  });

  it('accepts a normal two-sentence reply', () => {
    const text = 'Terima kasih sudah memberi tahu. Kami membuka kasir tambahan saat antrean lebih dari lima orang.';
    expect(checkReplyShape(text).every((c) => c.passed)).toBe(true);
  });
});

describe('writeReply', () => {
  const args = {
    review: REVIEW,
    sopPassage: SOP,
    voicePassage: null,
    outlet: { name: 'Bekasi Timur' },
    address: { salutation: 'Bapak', name: 'Andi' },
    fallbackText: 'Terima kasih sudah memberi tahu, Bapak Andi.',
  };

  it('uses the written reply when it is well formed', async () => {
    const gemini = modelSaying(
      'Terima kasih sudah memberi tahu, Bapak Andi. Kami membuka kasir tambahan saat antrean lebih dari lima orang.',
    );

    const result = await writeReply({ gemini, ...args });

    expect(result.generated).toBe(true);
    expect(result.step.costIdr).toBe(0.7);
  });

  it('keeps the assembled draft when the model leaves a marker in public text', async () => {
    const gemini = modelSaying('Terima kasih. Kasir tambahan dibuka dalam 10 menit [1].');

    const result = await writeReply({ gemini, ...args });

    expect(result.generated).toBe(false);
    expect(result.text).toBe(args.fallbackText);
  });

  it('keeps the assembled draft when the model is unreachable', async () => {
    const gemini = { generate: async () => { throw Object.assign(new Error('x'), { code: 'GEMINI_TIMEOUT' }); } };

    const result = await writeReply({ gemini, ...args });

    expect(result).toMatchObject({ generated: false, reason: 'GEMINI_TIMEOUT' });
  });

  it('never runs without a grounding clause', async () => {
    const gemini = modelSaying('apa pun');

    await writeReply({ gemini, ...args, sopPassage: null });

    expect(gemini.generate).not.toHaveBeenCalled();
  });
});

describe('draftReply with a model behind it (T061)', () => {
  const oneReview = async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 5000 });
    return data.reviews.find((r) => /antrean|kasir/i.test(r.text) && r.rating <= 3);
  };

  it('sends the assembled draft when no model is configured', async () => {
    const review = await oneReview();
    const { data } = await draftReply({ tenantId: TENANT, review });

    expect(data.drafted).toBe(true);
    expect(data.generated).toBe(false);
  });

  it('a generated draft still faces the guardrail, and still needs a human', async () => {
    const review = await oneReview();
    const gemini = modelSaying(
      'Terima kasih sudah memberi tahu kami. Kami menambah kasir saat antrean memanjang, sesuai SOP layanan kami.',
    );

    const { data } = await draftReply({ tenantId: TENANT, review, gemini });

    expect(data.generated).toBe(true);
    // Constitution II does not bend because a model wrote the words.
    expect(data.requiresApproval).toBe(review.rating <= 2);
    expect(guardrailCheck({ draftText: data.text, citations: data.citations }).data.checks.every((c) => c.passed)).toBe(
      true,
    );
  });

  it('keeps the citations attached to a generated draft', async () => {
    const review = await oneReview();
    const gemini = modelSaying('Terima kasih. Kami menambah kasir saat antrean memanjang.');

    const { data, sources } = await draftReply({ tenantId: TENANT, review, gemini });

    expect(data.citations.length).toBeGreaterThan(0);
    expect(sources.every((s) => s.type === 'document' && typeof s.page === 'number')).toBe(true);
  });
});
