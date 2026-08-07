# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **U1 Area Manager** (primary) — owns 5–15 branches and decides the day's
  actions. Reads the console around 07:00, before the branches open, on a
  laptop. Needs at most three decisions, not a dashboard.
- **U2 Branch Manager** — executes the actions U1 approves and asks policy
  questions ("can I refund an opened promo item?"). Reads answers, rarely
  writes.
- **U3 Head of Operations** — wants network-wide patterns rather than
  anecdotes; the audience for systemic findings, not for single reviews.
- **U4 EBCO delivery team** — operates LOKUS across several client tenants.
  The reason tenant isolation is a product property rather than a deployment
  detail.

Roles are enforced, not advisory: a viewer can read every screen and approve
nothing.

**Time-bounded reader — the EBCO AI Hackathon 2026 jury.** Until submission on
11 August 2026, the repository is itself an interface: one of the judges is an
AI that reads it. README, spec, commit history, and file names are therefore
read by a jury, not only by maintainers. This audience expires with the
deadline and must not be allowed to outrank U1–U4 in product decisions.

## Product Purpose

LOKUS turns three signals a multi-branch Indonesian business already owns, and
cannot currently use, into a small number of decisions someone can act on
today.

The signals: Google reviews that accumulate unanswered (median first response
nine days, most never answered), location decisions made without competitor
density or catchment data, and operating knowledge scattered across PDFs and
chat groups so branch staff improvise.

Three autonomous agents — Reputation, Location, Knowledge — run overnight under
a supervisor. Each night they read reviews, Places data, and internal SOPs; each
morning the console presents a briefing of **at most three decisions**, each
with a proposed action and a traceable source.

Success is a decision an area manager takes before 08:00 that they would
otherwise have taken nine days late, or not at all.

## Positioning

The mechanism a neighbouring product could not truthfully copy is refusal.

Every AI claim carries a retrievable source — a review id, an SOP page, a Places
response. Below a retrieval confidence of 0.70 the agent answers "tidak ada di
dokumen" and logs a knowledge gap instead of guessing. The rule is mechanical,
not stylistic: an agent finding without a source is never produced, so the
supervisor refuses without judging plausibility.

Two consequences that are also positioning:

- **The execution trace is rendered beside the answer it produced**, inside it
  rather than behind a toggle — tool names, latency, and cost per answer. A run
  that cannot be explained is treated as a bug.
- **The console states what it is not allowed to do.** Each outlet carries a
  listing level (absent / public / managed) derived from what Google's
  credentials actually returned, and metrics that assume full review history
  count only managed outlets while naming the ones excluded.

## Operating Context

- **Nightly cycle at 23:00 WIB; briefing ready by 06:00.** The product is read
  in a narrow morning window, not monitored all day.
- **Multi-tenant from the first query.** Tenant id is part of every query,
  document, and log line; switching tenants clears client state, and no cache
  is shared.
- **Two languages, one dataset.** Console chrome and agent-authored copy follow
  the reader's choice of Bahasa Indonesia (default) or English. Tenant content
  — review text, SOP passages, the published reply — is deliberately never
  translated.
- **Region `asia-southeast2`.**
- **Reply approval is a named human act.** A 1–2 star reply is never published
  without a named approver, and the approval is persisted and auditable.
- **Demo and judging.** The console runs its entire domain in the browser with
  no cloud project, and is published to GitHub Pages. A presenter can add a SOP
  document and a review live; both are tagged as demo data and never presented
  as having come from Google.

## Capabilities and Constraints

**Confirmed capabilities.** Morning briefing with approvable decisions; theme
clustering discovered from Indonesian review text rather than labels; grounded
reply drafts with four guardrails shown pass or fail; cited policy answers with
a refusal path; location scoring, site scouting, and self-cannibalisation
detection; conversational diagnosis with a visible execution trace; an action
board with ticket ownership and close-time SLA; an admin screen carrying the
production-readiness evidence.

**Binding constraints** (from `.specify/memory/constitution.md`, version 1.0.0,
ratified 2026-07-28):

- Grounded or silent, threshold 0.70. Never invent facts.
- Human owns the public voice on 1–2 star reviews. Agents never promise
  financial compensation and never disclose personal data.
- Every agent step records tool, input digest, latency, and token cost, and the
  trace is rendered in the UI.
- Multi-tenant by default; no cross-tenant read exists, even for admins.
- Per-tenant monthly budget enforced in code: degrade to the cheaper model tier
  above 90%, hard ceiling refuses the call.
- Spec before code, in its own commit.
- Every data panel implements four states: loading, empty, error,
  needs-permission.
- Design values come from `design/tokens.css` only. No ad-hoc colours, radii,
  or font stacks. (Recorded as a constraint; the visual world itself is not
  described here.)
- No secrets in the repository; Secret Manager only.

**Quality gates.** The eval suite must pass before deploy: theme accuracy
≥ 0.85, citation correctness ≥ 0.90, brand-voice compliance ≥ 0.80,
hallucination rate < 0.05, p95 latency < 10 s.

**Terminology that must not drift.** *Outlet* / *cabang* is a branch. *Listing
level* is L0 absent, L1 public, L2 managed — replying is a property of
ownership, and no API key or quota increase lifts L0 or L1 to a reply.
*Tenant* is a client business. A *knowledge gap* is a question the corpus could
not answer, recorded rather than papered over.

**Out of scope** (constitution): native mobile apps, real-time streaming
ingestion, POS integration, staff scheduling, social-media sentiment, and any
handling of customer PII beyond what Google returns publicly.

**Explicitly undecided.**

- **Life after 11 August 2026 — undecided.** Whether LOKUS becomes a product
  EBCO runs for real client tenants (as U4 implies) or ends at judging has not
  been settled. Future work must not assume either. If it becomes real, U1's
  daily 07:00 use outranks the judging surface; if it does not, the judging
  surface is the only one that ever mattered.
- **Q1 — Business Profile API access for the pilot tenant.** Which listing
  level each pilot outlet sits at cannot be known before access is requested;
  the Business Profile APIs start every project at zero quota until Google
  approves. The adapter interface is the same either way.
- **Q2 — which real SOP document can be used in the demo**, redacted or not.

## Brand Commitments

- **Name:** LOKUS. Tagline in the console chrome: *Local Ops Intelligence*.
- **Console copy is Bahasa Indonesia**, final in `design/SCREENS.md` and used
  as written. Code, comments, commit messages, and technical documents are
  English. An English console locale exists and translates the frame around
  tenant content, never the content.
- **Voice:** plain, specific, and unhedged. The console names what it excluded
  and why rather than rounding a number into confidence. Guardrails are shown
  passing as well as failing, because "no warnings" must be distinguishable
  from "no checks".
- **Authorship is disclosed, not hidden.** Sole participant: Ardian Widyo
  Prasetyo. The spec, the constitution, and every product decision are set by a
  human; the implementation is written by Claude Code against those rules. The
  README says so outright, on the reasoning that the commit history shows it
  anyway and disguising it would cost the credibility of everything else.

## Evidence on Hand

Real, in this repository:

- **Seeded dataset of 713 reviews** across eight outlets, deterministic from a
  seed, with an eight-week complaint matrix the clusterer must rediscover from
  text — and a test asserting that it does.
- **`eval/golden_set.jsonl`** — 60 cases across five thresholds, with a runner
  (`npm run eval`) that gates deploys and produces the figures screen 14 shows.
  1,055 tests across core, api, web, and eval.
- **Impact table in `README.md`** with a deliberately separate third column for
  what is actually proven in this build, distinct from baseline and target.
- **`docs/screenshots/`** — all fourteen screens, with a manifest.
- **`docs/exports/`** — SOP corpus PDF, review and outlet spreadsheets, agent
  and Terraform documentation.
- **`infra/`** — Terraform validated against Google provider 6.12.
- **Public demo:** https://ardianwidyo.github.io/lokus/ — all fourteen screens,
  no login, no cloud account.
- **`docs/demo-runbook.md`** — how to run and present without a cloud project.

Absences future work must not fabricate:

- **No field data and no pilot tenant.** Every figure comes from the seeded
  dataset. The mechanism is testable; real-world impact is not yet claimable.
- **Median first response time is a fixture**, not a measurement: every seeded
  sent reply is exactly six hours after its review. Nothing may cite it as
  evidence of agent speed. The README states this.
- **Terraform has never been applied** to a real project; Cloud Run deployment
  waits on an active billing account.
- **No testimonials, customers, benchmarks, pricing, or licensing exist.** Do
  not invent them.
- **Reviews and documents added through the demo composers are not Google
  data**, and the console tags them as demo everywhere they appear.

## Product Principles

1. **Refuse before guessing.** An answer without a retrievable source is worse
   than no answer. Every surface must make refusal a visible, dignified
   outcome rather than an error state.
2. **Three decisions, not a dashboard.** The product's value is subtraction. A
   screen that adds a number without removing a decision has made things worse.
3. **Show the work beside the claim.** Traces, citations, guardrail results,
   and exclusions belong next to what they justify — not behind a toggle, and
   not in a log a reader will never open.
4. **Name what you are not allowed to do.** Listing levels, excluded outlets,
   role limits, and budget ceilings are stated plainly. A capability the
   product lacks is reported, never disguised as one waiting on a click.
5. **The tenant boundary is absolute.** It holds in queries, caches, logs, and
   error messages — a refusal must not reveal whether a record exists in
   another tenant.

## Accessibility & Inclusion

**WCAG 2.2 AA is binding.** Future design and audit work measures against it
rather than against existing practice.

Already in place and not to be regressed: text contrast asserted from
`design/tokens.css` in both the light and dark themes; review rows as a real
keyboard listbox so the advertised shortcuts (↑ ↓ ⏎ E) are the same affordance
screen readers receive; semantic structure and accessible names checked in
`web/test/accessibility.test.jsx`; status conveyed by shape and tag rather than
by red/green alone; `<html lang>` synchronised with the reader's locale.

Product-specific need: the primary reader works in Bahasa Indonesia, and
agent-authored copy is generated in the reader's language rather than
translated after the fact.
