import { toolResult } from '../lib/toolResult.js';

/**
 * `guardrail.check` — the four checks screen 06 shows before the send action.
 *
 * AC-3.4: all four results are visible before sending, not just the failures —
 * a reviewer needs to see that a check ran and passed, otherwise "no warnings"
 * is indistinguishable from "no checks".
 *
 * Each check returns its own evidence so a failure can be acted on rather than
 * merely obeyed.
 */

export const GUARDRAIL_CHECKS = Object.freeze([
  'unsourced_claim',
  'personal_data',
  'tone_compliance',
  'compensation_promise',
]);

/** Money, vouchers, discounts — forbidden in a public reply (AC-3.3). */
const COMPENSATION_PATTERNS = [
  /\bvoucher\b/i,
  /\bganti rugi\b/i,
  /\bkompensasi\b/i,
  /\bpotongan harga\b/i,
  /\bdiskon\b/i,
  /\buang kembali\b/i,
  /\bpengembalian (?:dana|tunai|uang)\b/i,
  /\brefund\b/i,
  /\bgratis\b/i,
  /\bcashback\b/i,
];

/** Anything that identifies the customer beyond the name they published. */
const PERSONAL_DATA_PATTERNS = [
  { name: 'nomor telepon', pattern: /(?:\+62|62|0)8\d{7,11}\b/ },
  { name: 'email', pattern: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  { name: 'nomor pesanan', pattern: /\b(?:no\.?|nomor)\s*(?:pesanan|order|struk)\s*[:#]?\s*\w+/i },
  { name: 'NIK', pattern: /\b\d{16}\b/ },
  { name: 'alamat rumah', pattern: /\b(?:jl\.?|jalan)\s+[a-z]/i },
];

/** Brand voice: defensive, blaming, or over-promising language. */
const TONE_PATTERNS = [
  { name: 'menyalahkan pelanggan', pattern: /\b(?:salah anda|anda sendiri|seharusnya anda)\b/i },
  { name: 'defensif', pattern: /\b(?:tidak mungkin|itu bukan salah kami|kami tidak pernah)\b/i },
  { name: 'janji tanpa tanggal', pattern: /\b(?:pasti|dijamin|selamanya|tidak akan pernah lagi)\b/i },
  { name: 'istilah internal', pattern: /\b(?:SKU|shrinkage|footfall|COGS)\b/ },
];

/**
 * An unsourced claim is a specific commitment with no citation behind it. The
 * check is deliberately blunt: if the draft states a number, a time window, or
 * a rule, at least one citation must exist.
 */
const SPECIFIC_CLAIM_PATTERN = /\b\d+\s*(?:menit|jam|hari|persen|%)\b|\bpukul\s*\d|\bsesuai (?:SOP|ketentuan)\b/i;

function check(name, passed, detail, evidence = []) {
  return { name, passed, detail, evidence };
}

export function checkUnsourcedClaim(text, citations) {
  const makesClaim = SPECIFIC_CLAIM_PATTERN.test(text ?? '');
  const hasCitation = Array.isArray(citations) && citations.length > 0;

  if (!makesClaim) {
    return check('unsourced_claim', true, 'Tidak ada klaim spesifik yang perlu sumber.');
  }
  if (hasCitation) {
    const pages = citations.map((citation) => `${citation.docId} hal. ${citation.page}`);
    return check('unsourced_claim', true, `Klaim bersumber pada ${pages.join(' dan ')}.`, pages);
  }
  return check(
    'unsourced_claim',
    false,
    'Balasan menyebut aturan atau angka spesifik tanpa satu pun kutipan sumber.',
    [text.match(SPECIFIC_CLAIM_PATTERN)?.[0]].filter(Boolean),
  );
}

export function checkPersonalData(text) {
  const found = PERSONAL_DATA_PATTERNS.filter(({ pattern }) => pattern.test(text ?? '')).map(
    ({ name }) => name,
  );

  return found.length === 0
    ? check('personal_data', true, 'Tidak ada data pribadi pelanggan di dalam balasan.')
    : check('personal_data', false, `Balasan memuat ${found.join(', ')}.`, found);
}

export function checkTone(text) {
  const found = TONE_PATTERNS.filter(({ pattern }) => pattern.test(text ?? '')).map(({ name }) => name);

  return found.length === 0
    ? check('tone_compliance', true, 'Nada sesuai panduan: mengakui, konkret, tanpa janji berlebihan.')
    : check('tone_compliance', false, `Nada menyimpang: ${found.join(', ')}.`, found);
}

export function checkCompensationPromise(text) {
  const found = COMPENSATION_PATTERNS.filter((pattern) => pattern.test(text ?? ''))
    .map((pattern) => (text.match(pattern) ?? [])[0])
    .filter(Boolean);

  return found.length === 0
    ? check('compensation_promise', true, 'Tidak ada janji kompensasi finansial.')
    : check('compensation_promise', false, `Balasan menjanjikan ${found.join(', ')}.`, found);
}

/**
 * Runs all four. Always returns four results, in a stable order, whether they
 * pass or fail — the panel on screen 06 reads "lolos 4/4" off this array.
 */
export function guardrailCheck({ draftText, citations = [] } = {}) {
  const startedAt = Date.now();

  const checks = [
    checkUnsourcedClaim(draftText, citations),
    checkPersonalData(draftText),
    checkTone(draftText),
    checkCompensationPromise(draftText),
  ];

  const passedCount = checks.filter((entry) => entry.passed).length;

  return toolResult({
    data: {
      checks,
      passed: passedCount === checks.length,
      passedCount,
      total: checks.length,
      summary: `Guardrail lolos ${passedCount}/${checks.length}`,
    },
    // The guardrail cites the citations it verified against; with none, it has
    // nothing to stand on and says so by returning an empty array.
    sources: citations.map((citation) => ({
      type: 'document',
      docId: citation.docId,
      page: citation.page,
      score: citation.score,
    })),
    startedAt,
  });
}
