import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { draftReply } from '../src/reputation/draftReply.js';
import { GUARDRAIL_CHECKS, guardrailCheck } from '../src/reputation/guardrails.js';

const TENANT = 'nusa-retail';
const CITATION = { docId: 'sop-layanan-v4', page: 12, score: 0.9 };

const named = (result, name) => result.data.checks.find((check) => check.name === name);

describe('guardrail.check (AC-3.4)', () => {
  it('always returns all four checks, in a stable order', () => {
    const result = guardrailCheck({ draftText: 'Terima kasih atas masukannya.' });

    expect(result.data.checks.map((check) => check.name)).toEqual(GUARDRAIL_CHECKS);
    expect(result.data.total).toBe(4);
  });

  it('reports passes as well as failures, so "no warning" is not ambiguous', () => {
    const result = guardrailCheck({ draftText: 'Terima kasih atas masukannya.' });

    expect(result.data.checks.every((check) => check.detail.length > 0)).toBe(true);
    expect(result.data.summary).toBe('Cek pengaman lolos 4/4');
  });

  it('gives evidence with each failure so it can be acted on', () => {
    const result = guardrailCheck({
      draftText: 'Kami beri voucher belanja dan hubungi 081234567890.',
    });

    expect(named(result, 'compensation_promise').evidence).toContain('voucher');
    expect(named(result, 'personal_data').evidence).toContain('nomor telepon');
  });
});

describe('unsourced claim', () => {
  it('fails a specific claim with no citation behind it', () => {
    const result = guardrailCheck({
      draftText: 'Sesuai SOP kami, antrean di atas 10 menit wajib ditangani.',
      citations: [],
    });

    expect(named(result, 'unsourced_claim').passed).toBe(false);
  });

  it('passes the same claim once it is cited', () => {
    const result = guardrailCheck({
      draftText: 'Sesuai SOP kami, antrean di atas 10 menit wajib ditangani.',
      citations: [CITATION],
    });

    expect(named(result, 'unsourced_claim').passed).toBe(true);
    expect(named(result, 'unsourced_claim').detail).toMatch(/hal\. 12/);
  });

  it('does not demand a citation from a reply that claims nothing specific', () => {
    const result = guardrailCheck({ draftText: 'Terima kasih sudah memberi tahu kami.' });

    expect(named(result, 'unsourced_claim').passed).toBe(true);
  });
});

describe('personal data', () => {
  it.each([
    ['nomor telepon', 'Hubungi kami di 081234567890 ya.'],
    ['email', 'Kirim ke ratna@contoh.co.id.'],
    ['nomor pesanan', 'Nomor pesanan: A8891 sudah kami cek.'],
    ['NIK', 'NIK 3204010101900001 sudah terverifikasi.'],
    ['alamat rumah', 'Kurir menuju Jl. Melati No. 4.'],
  ])('fails on %s', (_label, text) => {
    expect(named(guardrailCheck({ draftText: text }), 'personal_data').passed).toBe(false);
  });

  it('allows the reviewer\'s published first name', () => {
    const result = guardrailCheck({ draftText: 'Terima kasih sudah memberi tahu, Kak Ratna.' });

    expect(named(result, 'personal_data').passed).toBe(true);
  });
});

describe('tone', () => {
  it.each([
    'Itu salah Anda sendiri, bukan kami.',
    'Tidak mungkin antreannya selama itu.',
    'Kami jamin tidak akan pernah lagi terjadi.',
    'Masalahnya ada di SKU dan footfall cabang.',
  ])('fails on %p', (text) => {
    expect(named(guardrailCheck({ draftText: text }), 'tone_compliance').passed).toBe(false);
  });

  it('passes a warm, concrete reply', () => {
    const result = guardrailCheck({
      draftText: 'Antrean sepanjang itu tidak sesuai standar kami, dan kami perbaiki mulai pekan ini.',
      citations: [CITATION],
    });

    expect(named(result, 'tone_compliance').passed).toBe(true);
  });
});

describe('compensation promise (AC-3.3)', () => {
  it.each(['voucher', 'ganti rugi', 'kompensasi', 'potongan harga', 'diskon', 'refund', 'gratis'])(
    'fails when the reply offers %s',
    (word) => {
      const result = guardrailCheck({ draftText: `Kami akan memberikan ${word} sebagai permintaan maaf.` });

      expect(named(result, 'compensation_promise').passed).toBe(false);
      expect(result.data.passed).toBe(false);
    },
  );
});

describe('guardrails over every generated draft', () => {
  it('passes 4/4 on every draft the generator produces', async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 5000 });
    const complaints = data.reviews.filter((review) => review.rating <= 3).slice(0, 80);

    for (const review of complaints) {
      const draft = await draftReply({ tenantId: TENANT, review });
      if (!draft.data.drafted) continue;

      const result = guardrailCheck({
        draftText: draft.data.text,
        citations: draft.data.citations,
      });

      expect(result.data.passed, `${review.id}: ${result.data.summary}`).toBe(true);
    }
  });

  it('stands on nothing when there are no citations to verify against', () => {
    const result = guardrailCheck({ draftText: 'Terima kasih.' });

    expect(result.sources).toEqual([]);
  });
});
