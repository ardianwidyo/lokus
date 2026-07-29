import { OUTLETS } from '../domain/outlets.js';

/**
 * `supervisor.route` — which agents a question needs.
 *
 * Intent names come from contracts/agent-tools.json. Routing is keyword-based
 * over Indonesian, and deliberately errs towards asking one agent too many: a
 * superfluous tool call costs a little money, while a missing one produces an
 * answer with a hole in it that nobody can see.
 */
export const INTENTS = Object.freeze({
  DIAGNOSIS_CABANG: 'diagnosis_cabang',
  RINGKAS_REVIEW: 'ringkas_review',
  PERTANYAAN_KEBIJAKAN: 'pertanyaan_kebijakan',
  CARI_LOKASI: 'cari_lokasi',
  BANDINGKAN_LOKASI: 'bandingkan_lokasi',
  LAIN: 'lain',
});

const RULES = [
  {
    intent: INTENTS.DIAGNOSIS_CABANG,
    agents: ['reputation', 'location', 'knowledge'],
    patterns: [/\bkenapa\b/i, /\bmengapa\b/i, /\bturun\b/i, /\bnaik\b/i, /\bpenyebab\b/i, /\bdiagnos/i],
  },
  {
    intent: INTENTS.BANDINGKAN_LOKASI,
    agents: ['location'],
    patterns: [/\bbandingkan\b/i, /\bdibanding(?:kan)?\b/i, /\bversus\b/i, /\bmana yang lebih\b/i],
  },
  {
    intent: INTENTS.CARI_LOKASI,
    agents: ['location'],
    patterns: [/\bcari lokasi\b/i, /\bkandidat\b/i, /\bekspansi\b/i, /\bcabang baru\b/i, /\bbuka di\b/i],
  },
  {
    intent: INTENTS.PERTANYAAN_KEBIJAKAN,
    agents: ['knowledge'],
    patterns: [/\bsop\b/i, /\bboleh\b/i, /\baturan\b/i, /\bkebijakan\b/i, /\brefund\b/i, /\bsyarat\b/i, /\bprosedur\b/i],
  },
  {
    intent: INTENTS.RINGKAS_REVIEW,
    agents: ['reputation'],
    patterns: [/\bringkas\b/i, /\bkeluhan\b/i, /\breview\b/i, /\btema\b/i, /\brating\b/i, /\bsentimen\b/i],
  },
];

/** Finds an outlet named anywhere in the question, by name, short name or code. */
export function detectOutlet(question) {
  const haystack = String(question ?? '').toLowerCase();

  return (
    OUTLETS.find(
      (outlet) =>
        haystack.includes(outlet.name.toLowerCase()) ||
        haystack.includes(outlet.shortName.toLowerCase()) ||
        haystack.includes(outlet.code.toLowerCase()),
    ) ?? null
  );
}

export function route({ question, context = {} } = {}) {
  const text = String(question ?? '');
  const matched = RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text)));

  const outlet = detectOutlet(text) ?? (context.outletId ? { outletId: context.outletId } : null);

  if (matched.length === 0) {
    return { intent: INTENTS.LAIN, agents: ['knowledge'], outletId: outlet?.outletId ?? null };
  }

  // A "kenapa" question about one branch is a diagnosis even if it also
  // mentions reviews, so the widest matching rule wins.
  const primary = matched.reduce((widest, rule) =>
    rule.agents.length > widest.agents.length ? rule : widest,
  );

  const agents = [...new Set(matched.flatMap((rule) => rule.agents))];

  return {
    intent: primary.intent,
    agents,
    outletId: outlet?.outletId ?? null,
  };
}
