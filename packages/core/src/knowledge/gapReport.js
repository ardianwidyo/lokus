import { THEMES } from '../domain/themes.js';
import { assertTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';
import { tokenise } from './retrieval.js';

/**
 * `kb.gapReport` — what the corpus keeps failing to answer, and a clause that
 * would close it.
 *
 * Gaps are clustered by the theme they belong to rather than listed one by
 * one: "37 unanswered questions" is a number nobody can act on, while "twelve
 * of them are about queue time limits" points at one paragraph somebody can
 * write this afternoon.
 *
 * The proposed clause is a *draft for a human*, never something the system
 * adopts. It is labelled as such everywhere it surfaces.
 */

/** Clause templates per theme, written to be edited rather than accepted. */
const CLAUSE_DRAFTS = Object.freeze({
  'antrean-kasir':
    'Antrean lebih dari 10 menit wajib dilaporkan ke area manager pada hari yang sama, dan cabang membuka kasir tambahan sampai antrean kembali di bawah batas tersebut.',
  kebersihan:
    'Tumpahan dan lantai kotor wajib dibersihkan paling lambat 15 menit setelah ditemukan, dan area belanja diperiksa ulang setiap pergantian shift.',
  'stok-kosong':
    'Barang pada rak utama yang habis wajib dicatat pada log restock dan dipesan ulang pada hari yang sama; ketidaktersediaan lebih dari dua hari dilaporkan ke area manager.',
  parkir:
    'Kepadatan parkir pada jam sibuk dicatat harian selama dua pekan sebelum kapasitas ditinjau, dan staf tidak menjanjikan penambahan lahan kepada pelanggan.',
  'harga-vs-pesaing':
    'Perbedaan harga dengan kompetitor dilaporkan ke tim kategori, bukan diselesaikan dengan potongan di kasir.',
  'keramahan-staf':
    'Keluhan sikap staf ditindaklanjuti melalui coaching pada shift berikutnya dan hasilnya dicatat oleh manajer cabang.',
});

const GENERIC_CLAUSE =
  'Tambahkan satu klausa yang menjawab pertanyaan ini secara eksplisit, dengan angka atau batas waktu yang bisa diukur.';

/** A gap asked this often is worth writing a clause for. */
export const CLAUSE_PROPOSAL_THRESHOLD = 2;

/**
 * Matches a question to a complaint theme by keyword, the same table the
 * clusterer uses — so a gap about queues and a review about queues land in the
 * same bucket rather than two vocabularies drifting apart.
 */
export function classifyGap(question) {
  const words = new Set(tokenise(question));
  let best = null;

  for (const theme of THEMES) {
    const score = theme.keywords.reduce(
      (sum, keyword) => sum + (words.has(keyword.term) ? keyword.weight : 0),
      0,
    );
    if (score > 0 && (!best || score > best.score)) best = { theme: theme.id, score };
  }

  return best?.theme ?? null;
}

export async function gapReport({ tenantId, gapLog, coverage = null, days = 30 } = {}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  const entries = gapLog?.list(tenantId) ?? [];

  /** theme (or 'lain') → the gaps that belong to it */
  const clusters = new Map();
  for (const entry of entries) {
    const theme = classifyGap(entry.question) ?? 'lain';
    const bucket = clusters.get(theme) ?? { theme, questions: [], occurrences: 0, askedBy: new Set() };

    bucket.questions.push(entry.question);
    bucket.occurrences += entry.occurrences;
    for (const person of entry.askedBy) bucket.askedBy.add(person);
    clusters.set(theme, bucket);
  }

  const gaps = [...clusters.values()]
    .map((bucket) => ({
      theme: bucket.theme,
      occurrences: bucket.occurrences,
      questionCount: bucket.questions.length,
      questions: bucket.questions.slice(0, 5),
      askedBy: [...bucket.askedBy],
      // Only propose where there is repeated evidence; a clause written for a
      // question asked once is noise in the SOP.
      proposedClause:
        bucket.occurrences >= CLAUSE_PROPOSAL_THRESHOLD
          ? (CLAUSE_DRAFTS[bucket.theme] ?? GENERIC_CLAUSE)
          : null,
      isDraft: true,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  return toolResult({
    data: {
      gaps,
      totalQuestions: entries.reduce((sum, entry) => sum + entry.occurrences, 0),
      distinctQuestions: entries.length,
      coverage,
      days,
      // Stated on the object, not only in the UI copy: nothing here is adopted
      // automatically, and every clause needs a human owner.
      clausesAreDrafts: true,
      proposalThreshold: CLAUSE_PROPOSAL_THRESHOLD,
    },
    // A gap report is a claim about absence. There is no passage to cite for
    // something the corpus does not contain, so the sources array is empty and
    // the supervisor cannot build an answer on it.
    sources: [],
    startedAt,
  });
}

export { CLAUSE_DRAFTS, GENERIC_CLAUSE };
