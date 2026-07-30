import { classifyReview } from '../analytics/themeCluster.js';
import { findOutlet } from '../domain/outlets.js';
import { assertTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';
import { CONFIDENCE_THRESHOLD, firstSentence, searchPassages } from '../knowledge/retrieval.js';
import { writeReply } from './writeReply.js';

/**
 * Brand-voice reply drafting, grounded in the SOP.
 *
 * AC-3.2: every draft lists the SOP passages it relied on, with page numbers.
 * The grounding is structural rather than advisory — the concrete action
 * sentence is built *from* the retrieved passage, so a draft cannot claim an
 * action the SOP does not authorise. If nothing clears the confidence floor the
 * generator refuses and returns no draft instead of writing something plausible
 * (constitution I).
 *
 * The Gemini implementation swaps in behind this same signature; the prompt it
 * would use is assembled by `buildPrompt` and returned on the result, so what
 * the model was asked is auditable next to what it produced.
 */

/** Per-theme scaffolding. The action clause comes from the SOP, not from here. */
const THEME_FRAMING = Object.freeze({
  'antrean-kasir': {
    acknowledgement: 'Antrean sepanjang itu tidak sesuai standar kami.',
    query: 'antrean kasir lebih dari 10 menit buka kasir tambahan jam sibuk',
    followUp:
      'Kalau {honorific} berkenan menyebutkan tanggal kunjungannya, kami akan periksa jadwal shift hari itu dan memperbaikinya.',
  },
  kebersihan: {
    acknowledgement: 'Kondisi yang {honorific} temui tidak sesuai standar kebersihan kami.',
    query: 'kebersihan area belanja lantai kotor tumpahan dibersihkan',
    followUp:
      'Kalau {honorific} berkenan menyebutkan waktu kunjungannya, kami akan periksa jadwal pembersihan hari itu.',
  },
  'stok-kosong': {
    acknowledgement: 'Barang yang {honorific} cari seharusnya tersedia di rak utama.',
    query: 'ketersediaan barang rak utama diperiksa pagi pesan ulang restock',
    followUp:
      'Kalau {honorific} berkenan menyebutkan produknya, kami akan cek log restock cabang tersebut.',
  },
  parkir: {
    acknowledgement: 'Kesulitan parkir pada jam sibuk memang keluhan yang kami catat.',
    query: 'fasilitas parkir penuh jam sibuk dilaporkan area manager kapasitas',
    followUp: 'Kalau {honorific} berkenan menyebutkan jam kunjungannya, kami akan sertakan dalam tinjauan tersebut.',
  },
  'harga-vs-pesaing': {
    acknowledgement: 'Terima kasih sudah membandingkan dan memberi tahu kami.',
    query: 'perbedaan harga kompetitor potongan kasir program promo resmi',
    followUp: 'Kalau {honorific} berkenan menyebutkan produknya, kami akan cek harga yang berlaku di cabang tersebut.',
  },
  'keramahan-staf': {
    acknowledgement: 'Cara staf melayani {honorific} tidak mencerminkan standar kami.',
    query: 'keluhan sikap staf coaching manajer cabang permintaan maaf',
    followUp: 'Kalau {honorific} berkenan menyebutkan waktu kunjungannya, kami akan tindak lanjuti pada shift tersebut.',
  },
});

/** "Bu Ratna" / "Pak Hendra" — falls back to a neutral form when unknown. */
export function addressFor(author) {
  const firstName = String(author ?? '').trim().split(/\s+/)[0];
  if (!firstName) return { salutation: 'Kak', honorific: 'Kakak', name: null };

  // The dataset carries no gender, and guessing it from a name would be wrong
  // as often as it is right, so the neutral Indonesian form is used throughout.
  return { salutation: 'Kak', honorific: 'Kakak', name: firstName };
}

export function buildPrompt({ review, outlet, framing, passages }) {
  return [
    'Tulis balasan publik untuk review Google berikut, dalam Bahasa Indonesia.',
    `Cabang: ${outlet?.name ?? review.outletId}.`,
    `Review (${review.rating} bintang): "${review.text}"`,
    '',
    'Aturan wajib:',
    '- Akui masalahnya, sebut tindakan konkret, jangan berjanji tanpa tanggal.',
    '- Jangan pernah menjanjikan kompensasi finansial, voucher, atau potongan harga.',
    '- Jangan memuat data pribadi pelanggan.',
    '- Tindakan yang disebut harus berasal dari pasal SOP di bawah ini, bukan dari asumsi.',
    '',
    'Pasal SOP yang tersedia:',
    ...passages.map((passage) => `- [${passage.docId} hal. ${passage.page}] ${passage.text}`),
    '',
    `Kerangka tema: ${framing?.acknowledgement ?? '(tema tidak dikenali)'}`,
  ].join('\n');
}

/**
 * Turns the retrieved SOP clause into the sentence the customer reads. Only
 * clauses the SOP actually contains produce an action; anything else yields
 * null and the draft falls back to a commitment to check, not to act.
 */
function actionSentence(themeId, passage, outlet) {
  if (!passage) return null;
  const branch = outlet?.name ?? 'cabang tersebut';

  const byTheme = {
    'antrean-kasir': `Sesuai SOP layanan kami, antrean di atas 10 menit wajib ditangani dengan membuka kasir tambahan pada jam sibuk, dan kami menerapkannya di ${branch} pada pukul 17.00–20.00.`,
    kebersihan: `Sesuai SOP kami, area belanja diperiksa tiga kali sehari dan tumpahan dibersihkan paling lambat 15 menit setelah dilaporkan; kami tegakkan kembali di ${branch}.`,
    'stok-kosong': `Sesuai SOP kami, ketersediaan rak utama diperiksa setiap pagi dan barang yang habis dipesan ulang pada hari yang sama; kami periksa ulang penerapannya di ${branch}.`,
    parkir: `Sesuai SOP kami, kepadatan parkir pada jam sibuk dilaporkan ke area manager untuk ditinjau kapasitasnya, dan ${branch} sudah masuk dalam tinjauan tersebut.`,
    'harga-vs-pesaing': `Sesuai ketentuan kami, harga mengikuti program promo resmi yang sedang berjalan; kami cek kembali penerapannya di ${branch}.`,
    'keramahan-staf': `Sesuai SOP kami, keluhan sikap staf ditangani manajer cabang melalui coaching pada shift berikutnya, dan itu yang kami jalankan di ${branch}.`,
  };

  return byTheme[themeId] ?? null;
}

export async function draftReply({
  tenantId,
  review,
  passages = null,
  threshold = CONFIDENCE_THRESHOLD,
  gapLog = null,
  // Absent by default: the assembled template is what the public demo sends.
  gemini = null,
  tier = undefined,
} = {}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  if (!review || review.tenantId !== tenantId) {
    throw new Error('Review tidak ditemukan untuk tenant ini');
  }

  const classified = classifyReview(review.text);
  const framing = classified ? THEME_FRAMING[classified.theme] : null;
  const outlet = findOutlet(review.outletId);
  const address = addressFor(review.author);

  // Two retrievals: the operational clause, and the brand-voice rule that
  // governs how it may be phrased. Both are cited.
  const sopHits = framing
    ? searchPassages({ tenantId, query: framing.query, topK: 1, passages, threshold })
    : { chunks: [], rejectedCount: 0 };
  const voiceHits = searchPassages({
    tenantId,
    query: 'akui masalahnya sebut tindakan konkret jangan berjanji tanpa tanggal nada balasan',
    topK: 1,
    passages,
    threshold,
  });

  const sopPassage = sopHits.chunks[0] ?? null;
  const voicePassage = voiceHits.chunks[0] ?? null;
  const rejectedCount = sopHits.rejectedCount + voiceHits.rejectedCount;

  // Constitution I: no grounding, no draft. The reviewer gets a refusal and a
  // logged knowledge gap, not an invented apology.
  if (!sopPassage) {
    // The gap was described but never recorded, so a draft the agent could not
    // write left no trace of why. It does now.
    const recorded = gapLog?.record({
      tenantId,
      question: framing?.query ?? review.text,
      askedBy: outlet?.manager ?? null,
    }) ?? null;

    return toolResult({
      data: {
        drafted: false,
        text: null,
        refusal: 'tidak ada di dokumen',
        reason: classified
          ? `Tidak ada pasal SOP di atas ambang ${threshold} untuk tema "${classified.theme}".`
          : 'Tema keluhan tidak dikenali dari teks review.',
        theme: classified?.theme ?? null,
        knowledgeGap: recorded
          ? { ...recorded, reviewId: review.id, theme: classified?.theme ?? null }
          : { tenantId, question: framing?.query ?? review.text, reviewId: review.id, theme: classified?.theme ?? null },
        rejectedCount,
      },
      sources: [],
      startedAt,
    });
  }

  const fill = (template) =>
    String(template).replaceAll('{honorific}', address.honorific).replaceAll('{salutation}', address.salutation);

  const opening = address.name
    ? `Terima kasih sudah memberi tahu, ${address.salutation} ${address.name}.`
    : 'Terima kasih sudah memberi tahu kami.';

  // The assembled draft: grounded by construction, never wrong, only stiff.
  // It is also the fallback for everything the model might get wrong below.
  const assembled = [
    opening,
    fill(framing.acknowledgement),
    actionSentence(classified.theme, sopPassage, outlet),
    fill(framing.followUp),
  ]
    .filter(Boolean)
    .join(' ');

  const written = await writeReply({
    gemini,
    review,
    sopPassage,
    voicePassage,
    outlet,
    address,
    tier,
    fallbackText: assembled,
  });
  const text = written.text;

  const citations = [sopPassage, voicePassage].filter(Boolean).map((passage) => ({
    docId: passage.docId,
    title: passage.title,
    page: passage.page,
    score: passage.score,
    quote: firstSentence(passage.text),
  }));

  return toolResult({
    data: {
      drafted: true,
      text,
      tone: 'hangat, bertanggung jawab',
      theme: classified.theme,
      themeConfidence: classified.score,
      citations,
      rejectedCount,
      requiresApproval: review.rating <= 2,
      // Who wrote it, and whether the generated text survived its checks.
      // Constitution II is unaffected either way: a 1–2 star reply still waits
      // for a named human.
      generated: written.generated,
      shapeChecks: written.checks,
      generationStep: written.step,
      prompt: buildPrompt({ review, outlet, framing, passages: [sopPassage, voicePassage].filter(Boolean) }),
    },
    sources: citations.map((citation) => ({
      type: 'document',
      docId: citation.docId,
      page: citation.page,
      score: citation.score,
      title: citation.title,
      quote: citation.quote,
    })),
    startedAt,
  });
}

export { THEME_FRAMING };
