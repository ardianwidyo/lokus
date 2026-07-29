# eval — agent evaluation suite (T050)

Sixty cases in `golden_set.jsonl`, run by `run_eval.mjs` against
`@lokus/core`. CI runs it on every pull request and blocks the merge when a
threshold fails.

```bash
npm run eval                                  # from the repo root
node eval/run_eval.mjs --report report.json   # with a machine-readable report
```

## The gates

From `.specify/memory/constitution.md`, "Quality Gates". The runner exits
non-zero if any of them fails.

| Metric | Threshold | What it measures |
|---|---|---|
| Ketepatan tema keluhan | ≥ 0.85 | the clusterer finds the right theme in a review it has never seen |
| Sitasi benar & relevan | ≥ 0.90 | a policy question retrieves the page that actually answers it |
| Kepatuhan nada brand | ≥ 0.80 | generated drafts pass all four guardrails and carry citations |
| Halusinasi terdeteksi | < 0.05 | the agent refuses when the corpus cannot support an answer |
| Latensi p95 | < 10 s | 95th percentile across every case |

Tenant isolation is **reported, not gated**: it is a hard invariant already
asserted by unit tests, and a single failure is a release blocker on its own
rather than something to average into a rate.

## Case categories

| Category | Cases | Shape |
|---|---|---|
| `theme` | 24 | review text → the theme it complains about |
| `citation` | 12 | question → the document and page that answers it |
| `brand_voice` | 10 | review → a draft that passes 4/4 guardrails with citations |
| `refusal` | 8 | question the corpus cannot answer → must refuse |
| `isolation` | 6 | a tool called for another tenant → must return nothing |

## Why the theme cases are written fresh

The seeded dataset is generated from `COMPLAINT_TEMPLATES`. If the golden set
quoted those same sentences, theme accuracy would be a tautology — the
clusterer would be scored on text it was effectively built around. Every
`theme` case is therefore written in different words, and a unit test in
`run_eval.test.mjs` asserts that no case reuses a template sentence.

That is what makes the metric a measurement rather than a restatement.

## What the suite has already caught

Running it for the first time failed three cases, all real defects rather than
bad test data:

- **Cleanliness vocabulary was too narrow.** "Meja lengket dan tidak dilap"
  matched nothing; the keyword table had `kotor` and `debu` but no word for a
  sticky, un-wiped surface. Fixed by adding the missing terms.
- **`kurang ramah` was invisible.** The table matched only the blunt `tidak
  ramah`, missing the softer and more common phrasing entirely.
- **Function words were diluting retrieval scores.** "Boleh memberi potongan di
  kasir karena kompetitor lebih murah?" ranked the correct clause first but at
  0.56, below the 0.70 floor, because `karena` and `lebih` occur in the corpus
  and were being normalised against. They are now stopwords.

After those three fixes every case passes, and the 382 unit tests still pass —
including the 36-cell theme matrix assertion, which is what proves the keyword
additions did not quietly reclassify the seeded corpus.

## Verifying the gate actually bites

An eval that can only go green is worthless. The runner was checked against a
deliberately broken golden set (wrong themes, an impossible page number, a
refusal case the corpus can answer, an isolation case pointed at the tenant's
own data) and correctly reported 3 failed gates, a failed isolation check, and
exit code 1.

Re-run that check after changing the runner:

```bash
node eval/run_eval.mjs path/to/broken_golden.jsonl; echo "exit=$?"
```

## Growing the set

T050 says start at 12 and grow to 60; it is at 60. When adding cases:

- write the review text yourself, never copy a seed template;
- keep one expectation per case, so a failure names one defect;
- add refusal cases for questions the corpus genuinely cannot answer — they are
  the only thing keeping the hallucination rate honest.
