import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { t } from '../i18n/index.js';
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

/**
 * Anything that identifies the customer beyond the name they published.
 *
 * The patterns stay Indonesian — they match Indonesian reply text — while `key`
 * names the thing found so the explanation can be read in either language.
 */
const PERSONAL_DATA_PATTERNS = [
  { key: 'phone', pattern: /(?:\+62|62|0)8\d{7,11}\b/ },
  { key: 'email', pattern: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  { key: 'orderNumber', pattern: /\b(?:no\.?|nomor)\s*(?:pesanan|order|struk)\s*[:#]?\s*\w+/i },
  { key: 'nationalId', pattern: /\b\d{16}\b/ },
  { key: 'homeAddress', pattern: /\b(?:jl\.?|jalan)\s+[a-z]/i },
];

/** Brand voice: defensive, blaming, or over-promising language. */
const TONE_PATTERNS = [
  { key: 'blamesCustomer', pattern: /\b(?:salah anda|anda sendiri|seharusnya anda)\b/i },
  { key: 'defensive', pattern: /\b(?:tidak mungkin|itu bukan salah kami|kami tidak pernah)\b/i },
  { key: 'undatedPromise', pattern: /\b(?:pasti|dijamin|selamanya|tidak akan pernah lagi)\b/i },
  { key: 'internalJargon', pattern: /\b(?:SKU|shrinkage|footfall|COGS)\b/ },
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

export function checkUnsourcedClaim(text, citations, locale = DEFAULT_LOCALE) {
  const makesClaim = SPECIFIC_CLAIM_PATTERN.test(text ?? '');
  const hasCitation = Array.isArray(citations) && citations.length > 0;

  if (!makesClaim) {
    return check('unsourced_claim', true, t(locale, 'guardrail.unsourcedNoClaim'));
  }
  if (hasCitation) {
    const pages = citations.map((citation) =>
      t(locale, 'guardrail.pageRef', { docId: citation.docId, page: citation.page }),
    );
    return check(
      'unsourced_claim',
      true,
      t(locale, 'guardrail.unsourcedCited', { pages: pages.join(t(locale, 'guardrail.and')) }),
      pages,
    );
  }
  return check(
    'unsourced_claim',
    false,
    t(locale, 'guardrail.unsourcedFailed'),
    [text.match(SPECIFIC_CLAIM_PATTERN)?.[0]].filter(Boolean),
  );
}

export function checkPersonalData(text, locale = DEFAULT_LOCALE) {
  const found = PERSONAL_DATA_PATTERNS.filter(({ pattern }) => pattern.test(text ?? '')).map(
    ({ key }) => t(locale, `guardrail.personalData.${key}`),
  );

  return found.length === 0
    ? check('personal_data', true, t(locale, 'guardrail.personalDataClean'))
    : check(
        'personal_data',
        false,
        t(locale, 'guardrail.personalDataFound', { found: found.join(', ') }),
        found,
      );
}

export function checkTone(text, locale = DEFAULT_LOCALE) {
  const found = TONE_PATTERNS.filter(({ pattern }) => pattern.test(text ?? '')).map(({ key }) =>
    t(locale, `guardrail.tone.${key}`),
  );

  return found.length === 0
    ? check('tone_compliance', true, t(locale, 'guardrail.toneClean'))
    : check('tone_compliance', false, t(locale, 'guardrail.toneFound', { found: found.join(', ') }), found);
}

export function checkCompensationPromise(text, locale = DEFAULT_LOCALE) {
  // The evidence is the offending phrase as the reply actually wrote it, so it
  // stays in the reply's language whatever the reader's is — quoting a
  // translation of what the draft said would be quoting something else.
  const found = COMPENSATION_PATTERNS.filter((pattern) => pattern.test(text ?? ''))
    .map((pattern) => (text.match(pattern) ?? [])[0])
    .filter(Boolean);

  return found.length === 0
    ? check('compensation_promise', true, t(locale, 'guardrail.compensationClean'))
    : check(
        'compensation_promise',
        false,
        t(locale, 'guardrail.compensationFound', { found: found.join(', ') }),
        found,
      );
}

/**
 * Runs all four. Always returns four results, in a stable order, whether they
 * pass or fail — the panel on screen 06 reads "lolos 4/4" off this array.
 */
export function guardrailCheck({ draftText, citations = [], locale = DEFAULT_LOCALE } = {}) {
  const startedAt = Date.now();

  const checks = [
    checkUnsourcedClaim(draftText, citations, locale),
    checkPersonalData(draftText, locale),
    checkTone(draftText, locale),
    checkCompensationPromise(draftText, locale),
  ];

  const passedCount = checks.filter((entry) => entry.passed).length;

  return toolResult({
    data: {
      checks,
      passed: passedCount === checks.length,
      passedCount,
      total: checks.length,
      summary: t(locale, 'guardrail.summary', { passed: passedCount, total: checks.length }),
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
