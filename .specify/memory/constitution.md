# LOKUS Constitution

## Core Principles

### I. Grounded or Silent (NON-NEGOTIABLE)
Every AI-produced claim, reply, or recommendation must cite a retrievable
source: a review id, an SOP document page, or a Places API response. If
retrieval confidence is below 0.70, the agent answers "tidak ada di dokumen"
and logs a knowledge gap instead of guessing. Numbers shown in the UI must be
traceable to the query that produced them. Never invent facts.

### II. Human Owns the Public Voice
No reply is published to a customer without human approval when the review is
1–2 stars. Approval state is persisted and auditable. Agents never promise
financial compensation, never disclose personal data, and never speak outside
the brand-voice guide.

### III. Every Step Is Traceable
Each agent step records tool name, input digest, latency, and token cost to
Firestore and Cloud Trace, and the trace is rendered in the UI next to the
answer it produced. A run that cannot be explained is a bug, not a feature.

### IV. Multi-Tenant by Default
Tenant id is part of every query, every document, and every log line. No
cross-tenant read is possible, even for admins. Tenant switching clears client
state; there is no shared cache.

### V. Cost Has a Ceiling
Per-tenant monthly budget is enforced in code. Above 90% of budget the system
degrades to the cheaper model tier and raises an alert; it never fails silently
and never exceeds the hard ceiling.

### VI. Spec Before Code (NON-NEGOTIABLE)
No implementation task starts before its spec section exists and is committed.
Changing behaviour means changing the active feature's `spec.md` first, in its
own commit — `specs/001-lokus-core/` for what the product does,
`specs/002-production-readiness/` for what keeps it running. The commit history
is the evidence of this process.

### VII. Ship What Runs
Every merge to `main` deploys. Demos run on the deployed URL, never on a
laptop. A feature that only works locally is not done.

### VIII. Personal Data Is Borrowed (NON-NEGOTIABLE)
A Google review carries its author's name and whatever that person chose to
write. Under UU PDP that is personal data, and being publicly visible on Maps
does not make it less so — it makes it visible, which is a different claim.
LOKUS processes it on the tenant's behalf and never on its own account: it
stays in the region the tenant was told it stays in, it is kept no longer than
the tenant's stated retention period, it leaves when the tenant leaves, and it
never appears in a log line, an error message, or anything that outlives the
request that needed it. LOKUS does not collect personal data from customers
directly, does not enrich it against other sources, and does not build a
profile of any individual. Deletion is a supported operation, not a favour.

## Quality Gates

- Agent evaluation suite (`eval/golden_set.jsonl`) must pass its thresholds
  before deploy: theme accuracy ≥ 0.85, citation correctness ≥ 0.90, brand-voice
  compliance ≥ 0.80, hallucination rate < 0.05, p95 latency < 10 s.
- Every data panel implements four states: loading, empty, error,
  needs-permission.
- No secrets in the repository; Secret Manager only.
- Design values come from `design/tokens.css`; no ad-hoc colors, radii, or font
  stacks.
- CI runs lint, unit tests, `terraform validate`, and the eval suite on every
  pull request.

## Development Workflow

1. Write or amend the spec section; commit it alone.
2. Pick the next task from `tasks.md` in phase order (P0 → P1 → P2 → P3 → P4 →
   P5, then P6).
3. Implement, with one commit per task prefixed by its task id.
4. Add or update the eval case or test that proves the acceptance criterion.
5. Merge to `main`; CI deploys.

Mandatory phases: P0 (foundation), P1 (reputation), P4 (orchestration),
P5 (hardening). P2 (knowledge) and P3 (location) may ship with reduced breadth
but must remain demonstrable — both carry bonus-theme points.

P6 (operations, `specs/002-production-readiness/`) is mandatory before the
first tenant who is not us, and optional before then. That ordering is the
point: the submission does not wait on it, and no tenant arrives without it.

## Out of Scope

Native mobile apps, real-time streaming ingestion, POS integration, and staff
scheduling.

Personal data is no longer named here. It was — "any handling of customer PII
beyond what Google returns publicly" — and that line was wrong in a way worth
recording rather than quietly deleting: it read as a boundary this system stays
behind, when in fact LOKUS crossed it the first time it read a review and put
the reviewer's name on a screen. A scope clause cannot exclude something the
product does. What LOKUS owes the people in that data is a principle now
(VIII), which is a thing that can be enforced, rather than a scope note, which
is a thing that can only be believed.

## Governance

This constitution supersedes ad-hoc decisions. Any deviation must be recorded
in `plan.md` under "Risks & mitigations" with the reason and the date. Pull
requests that violate a NON-NEGOTIABLE principle are rejected regardless of
deadline pressure.

**Version**: 1.1.0 · **Ratified**: 2026-07-28 · **Last amended**: 2026-08-08

Amendment log:

- **1.1.0 · 2026-08-08** — Principle VIII added (personal data), the PII line
  removed from Out of Scope, and Principle VI plus the workflow generalised from
  one feature to two. Reason: `specs/002-production-readiness/` spec.md Q6. The
  old scope clause described a boundary the product does not stay behind.
