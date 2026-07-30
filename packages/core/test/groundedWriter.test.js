import { describe, expect, it, vi } from 'vitest';

import {
  buildAnswerPrompt,
  checkGrounding,
  isGroundedText,
  writeGroundedAnswer,
} from '../src/knowledge/groundedWriter.js';

const CITATIONS = [
  { marker: '[1]', title: 'SOP Layanan Pelanggan v4', page: 12, text: 'Barang promo yang sudah dibuka tidak dapat dikembalikan.' },
  { marker: '[2]', title: 'SOP Layanan Pelanggan v4', page: 13, text: 'Pengecualian berlaku bila barang cacat produksi.' },
];

const FALLBACK = 'Barang promo yang sudah dibuka tidak dapat dikembalikan. [1]';

const modelSaying = (text) => ({
  generate: vi.fn(async () => ({
    text,
    model: 'gemini-2.0-flash',
    tier: 'gemini-reasoning',
    tokens: { input: 100, output: 40 },
    costIdr: 0.42,
    ms: 700,
  })),
});

describe('grounding checks', () => {
  it('rejects an answer that cites nothing', () => {
    // Fluent, plausible, and completely unattributable — the exact failure
    // mode a language model introduces that concatenation could not.
    expect(isGroundedText('Barang promo tidak bisa dikembalikan.', CITATIONS)).toBe(false);
  });

  it('rejects a marker that points at a source that does not exist', () => {
    expect(isGroundedText('Barang promo tidak bisa dikembalikan [4].', CITATIONS)).toBe(false);
  });

  it('accepts an answer whose every marker resolves', () => {
    expect(isGroundedText('Tidak bisa [1], kecuali cacat produksi [2].', CITATIONS)).toBe(true);
  });

  it('names the rule that broke, not merely that one did', () => {
    const failed = checkGrounding('Tidak bisa dikembalikan.', CITATIONS).filter((c) => !c.passed);
    expect(failed.map((c) => c.id)).toEqual(['cites-something']);
  });
});

describe('the prompt', () => {
  it('carries the passages and nothing the model must guess', () => {
    const prompt = buildAnswerPrompt({ question: 'Boleh refund?', citations: CITATIONS });

    expect(prompt).toContain('Boleh refund?');
    expect(prompt).toContain('Barang promo yang sudah dibuka tidak dapat dikembalikan.');
    expect(prompt).toContain('[2] SOP Layanan Pelanggan v4, hal. 13');
  });

  it('tells the model to refuse rather than reach outside the passages', () => {
    const prompt = buildAnswerPrompt({ question: 'x', citations: CITATIONS });

    expect(prompt).toMatch(/HANYA dari kutipan/);
    expect(prompt).toMatch(/Tidak ada di dokumen/);
    expect(prompt).toMatch(/Jangan mengarang penanda baru/);
  });
});

describe('writeGroundedAnswer (T061)', () => {
  it('uses the generated answer when it is properly cited', async () => {
    const gemini = modelSaying('Tidak bisa dikembalikan [1], kecuali cacat produksi [2].');

    const result = await writeGroundedAnswer({
      gemini,
      question: 'Boleh refund?',
      citations: CITATIONS,
      fallbackText: FALLBACK,
    });

    expect(result.generated).toBe(true);
    expect(result.text).toContain('cacat produksi [2]');
    expect(result.step).toMatchObject({ tool: 'gemini.generate', costIdr: 0.42 });
  });

  it('falls back to the deterministic answer when the model cites nothing', async () => {
    const gemini = modelSaying('Barang promo tidak bisa dikembalikan sama sekali.');

    const result = await writeGroundedAnswer({
      gemini,
      question: 'Boleh refund?',
      citations: CITATIONS,
      fallbackText: FALLBACK,
    });

    expect(result.generated).toBe(false);
    expect(result.reason).toBe('ungrounded');
    expect(result.text).toBe(FALLBACK);
  });

  it('falls back when the model invents a source', async () => {
    const gemini = modelSaying('Refund selalu boleh dalam 30 hari [7].');

    const result = await writeGroundedAnswer({
      gemini,
      question: 'Boleh refund?',
      citations: CITATIONS,
      fallbackText: FALLBACK,
    });

    expect(result.generated).toBe(false);
    expect(result.text).toBe(FALLBACK);
  });

  it('still charges for a rejected generation, because it happened', async () => {
    // Hiding the cost of a discarded call would understate the budget.
    const gemini = modelSaying('Tidak bisa dikembalikan.');

    const result = await writeGroundedAnswer({
      gemini,
      question: 'x',
      citations: CITATIONS,
      fallbackText: FALLBACK,
    });

    expect(result.generated).toBe(false);
    expect(result.step.costIdr).toBe(0.42);
  });

  it('honours the model refusing, rather than overriding it with passages', async () => {
    const gemini = modelSaying('Tidak ada di dokumen.');

    const result = await writeGroundedAnswer({
      gemini,
      question: 'Berapa lama garansi?',
      citations: CITATIONS,
      fallbackText: FALLBACK,
    });

    expect(result.refused).toBe(true);
    expect(result.text).toBe('Tidak ada di dokumen.');
  });

  it('degrades to the deterministic answer when the model is unreachable', async () => {
    const gemini = {
      generate: async () => {
        const error = new Error('down');
        error.code = 'GEMINI_UNREACHABLE';
        throw error;
      },
    };

    const result = await writeGroundedAnswer({
      gemini,
      question: 'x',
      citations: CITATIONS,
      fallbackText: FALLBACK,
    });

    expect(result.generated).toBe(false);
    expect(result.reason).toBe('GEMINI_UNREACHABLE');
    expect(result.text).toBe(FALLBACK);
  });

  it('does nothing at all with no model configured', async () => {
    const result = await writeGroundedAnswer({
      gemini: null,
      question: 'x',
      citations: CITATIONS,
      fallbackText: FALLBACK,
    });

    expect(result).toMatchObject({ generated: false, reason: 'no-model', text: FALLBACK });
  });

  it('never calls the model when there is nothing to ground against', async () => {
    const gemini = modelSaying('apa pun');

    await writeGroundedAnswer({ gemini, question: 'x', citations: [], fallbackText: 'Tidak ada di dokumen.' });

    expect(gemini.generate).not.toHaveBeenCalled();
  });
});
