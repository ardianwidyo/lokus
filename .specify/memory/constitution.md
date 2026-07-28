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
Changing behaviour means changing `specs/001-lokus-core/spec.md` first, in its
own commit. The commit history is the evidence of this process.

### VII. Ship What Runs
Every merge to `main` deploys. Demos run on the deployed URL, never on a
laptop. A feature that only works locally is not done.

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
2. Pick the next task from `tasks.md` in phase order (P0 → P1 → P2 → P3 → P4 → P5).
3. Implement, with one commit per task prefixed by its task id.
4. Add or update the eval case or test that proves the acceptance criterion.
5. Merge to `main`; CI deploys.

Mandatory phases: P0 (foundation), P1 (reputation), P4 (orchestration),
P5 (hardening). P2 (knowledge) and P3 (location) may ship with reduced breadth
but must remain demonstrable — both carry bonus-theme points.

## Out of Scope

Native mobile apps, real-time streaming ingestion, POS integration, staff
scheduling, and any handling of customer PII beyond what Google returns
publicly.

## Governance

This constitution supersedes ad-hoc decisions. Any deviation must be recorded
in `plan.md` under "Risks & mitigations" with the reason and the date. Pull
requests that violate a NON-NEGOTIABLE principle are rejected regardless of
deadline pressure.

**Version**: 1.0.0 · **Ratified**: 2026-07-28 · **Last amended**: 2026-07-28
