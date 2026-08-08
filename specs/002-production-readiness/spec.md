# Feature Specification: LOKUS Production Readiness

**Feature branch**: `002-production-readiness`
**Status**: ready for planning
**Language**: no new product copy. Where a screen or a message is added, it
follows US-8 — Indonesian by default, English by choice. Code and docs in English.

**Numbering**: user stories continue at US-11 and acceptance criteria at AC-11.x,
so every reference in `tasks.md` stays unique across both features. Nothing in
001 is renumbered.

## Problem

LOKUS works. Fourteen screens run, three agents answer, every claim carries its
source, CI is green, and the eval suite passes its thresholds. What LOKUS has
never done is **survive a night as somebody's production system**.

An audit against the code on 2026-08-08 (`docs/production-readiness.md`, commit
`4c950bc`) found nineteen gaps. Eight are tracked somewhere in 001 — five of
them by tasks that were satisfied with an in-memory implementation and therefore
*look* finished. Eleven appear in no spec, plan, task, or constitution at all.
This specification governs all nineteen.

Three of the eight are worth naming here, because a reader of `tasks.md` would
otherwise conclude they are done:

- **T011, T020 and T041** name BigQuery, Cloud Storage and Firestore. All three
  were implemented against in-memory stores. Cloud Run stops an idle instance,
  so today a ticket raised at noon is gone by evening — including the approval
  record AC-3.1 requires be kept.
- **T044** names the nightly cycle. The Cloud Scheduler, the Pub/Sub topic, the
  retry policy and the dead-letter queue exist in Terraform. The endpoint they
  push to, `/v1/internal/nightly-cycle`, does not exist in the API. Applied as
  it stands, every night is five failed deliveries and no Briefing Pagi.
- **T051** names alerting. Two alert policies exist and neither declares a
  notification channel, so both fire into a console nobody is watching.

The pattern is one thing, not three: **001 planned for a demo, and a demo has no
second day.** The state that must outlive a process, the cycle that must run
unattended, the alarm that must reach a person — each was built exactly as far
as a demo needs and no further. That was the right call under a submission
deadline. It stops being the right call the moment a tenant pays.

## Users

Carried forward from 001: **U1** Area Manager, **U2** Branch Manager, **U3** Head
of Operations, **U4** EBCO delivery team. Two more matter here, and neither ever
opens a screen:

- **U5 Operator on call** — the person woken up when the briefing does not
  appear. Today that is one person, and the design must assume it stays one
  person: any procedure that needs a second pair of hands at 03:00 is a
  procedure that will not be followed.
- **U6 Tenant's reviewer** — the IT or legal contact who signs off before their
  company's data enters LOKUS. They will ask where the data lives, how long it
  is kept, who can read it, what happens when they leave, and what proves it.

## What this specification is not

It adds no product capability. No new screen, no new agent, no new answer a user
could not already get. Every story below is about the same system continuing to
work when nobody is watching it — and where a screen does change, it changes to
report a fact the operator already needed.

## User stories & acceptance criteria

### US-11 The deployment is real

As U4, the environment I hand to a tenant is one that has actually been created,
at an address that belongs to us.

`infra/` describes eleven kinds of resource and passes `terraform validate` on
every pull request. It has never been applied, because the project's billing
account is a closed trial. Validation proves syntax and types; it proves nothing
about quota, API enablement order, or an IAM binding that is one role short.
Those are found by applying, and they are found once.

- **AC-11.1** A named environment exists in Google Cloud, created by
  `terraform apply` from this repository against a live billing account, with
  its state in the remote backend rather than on somebody's laptop. The plan for
  that environment is clean — a second `apply` immediately afterwards changes
  nothing.
- **AC-11.2** Every secret container has a version before the first revision
  starts, and no placeholder value survives into an environment that verifies
  real tokens. A deployment holding a placeholder where a signing key belongs is
  refused, not warned about.
- **AC-11.3** A merge to `main` reaches the running services without a human
  step, and a revision that fails its health check does not receive traffic.
- **AC-11.4** The console answers on a domain the tenant's staff can be told to
  trust, over TLS, with `Strict-Transport-Security` set. `connect-src` names the
  API's own origin rather than every Cloud Run service in the world.
- **AC-11.5** The deployed environment states which it is — `dev`, `staging` or
  `prod` — on screen 14 and in `/healthz`, and the seeded dataset is never what a
  production environment serves.

### US-12 A real identity, and a tenant added without a deploy

As U6, my staff sign in with our own accounts. As U4, I add a tenant without
changing code.

The verification layer is finished and tested: signature, issuer, audience,
tenant claim, role claim, and refusal of any tenant the token does not grant.
What has never existed is an issuer. Identity Platform is not provisioned, so
there is no user to verify, and the console's SSO button refuses with
`NOT_IMPLEMENTED` rather than pretending. `LOKUS_AUTH_MODE=dev` fills the hole
for development and is correctly fenced — the server refuses to start under
`NODE_ENV=production` — but a fence is not a door.

The second half is that a tenant currently lives in a source file. Onboarding
means an edit, a review, a merge and a deploy. That is tolerable for the second
tenant and indefensible for the tenth.

- **AC-12.1** A person signs in with a Google account or an email link and
  receives an Identity Platform token carrying their tenant memberships and role.
  No screen in the console mints a token for itself.
- **AC-12.2** The dev auth mode is not merely refused in production — its absence
  is asserted. A deployed environment reports which auth mode it verifies under,
  and the deploy fails if that is anything but real token verification.
- **AC-12.3** A tenant, its members and their roles are stored, not compiled. A
  new tenant is created and a member invited by an admin action, and neither
  requires a deploy.
- **AC-12.4** Revoking a membership takes effect within one token lifetime, and
  the maximum lifetime is stated rather than inherited by accident.
- **AC-12.5** Every rule 001 proved against the seeded directory holds against
  the stored one, verified by the same tests: no cross-tenant read, role
  enforced server-side, a tenant outside the membership map refused identically
  whether or not it exists.

### US-13 Nothing is lost when a process restarts

As U1, the ticket I raised this morning is there this afternoon. As U6, the
record of who approved a public reply is a record, not a variable.

Everything the API holds is held in the process: agent traces, tickets,
knowledge documents, drafts, approvals, month-to-date spend. Cloud Run stops idle
instances by design, so this is not an edge case — it is every day, quietly.
Constitution II requires that a named human approve a 1–2 star reply and that the
approver and timestamp be persisted. Today they are persisted until the next
scale-to-zero.

The seam for fixing this already exists and is the reason 001 was built this way:
every store sits behind one interface, so the change lands in
`api/src/services/index.js` and in new adapter files, not across the domain.

- **AC-13.1** Tickets, approvals, agent runs and knowledge documents survive the
  process that created them. The proof is a restart in a deployed environment,
  not a passing unit test.
- **AC-13.2** A document's bytes live in Cloud Storage and are handed over
  through a short-lived signed URL rather than proxied, exactly as AC-10.11
  already specifies for production.
- **AC-13.3** Review facts and theme rollups are computed in BigQuery from the
  SQL already in `infra/sql/`, and the in-memory warehouse remains what tests and
  the browser-only demo use — one interface, two implementations, as with every
  other external dependency.
- **AC-13.4** Every stored row, document and query carries its tenant id, and a
  query without one is refused by the storage layer rather than by the caller.
  This is Constitution IV applied one level lower than 001 applied it.
- **AC-13.5** Month-to-date spend is read from storage on boot, so a restart
  cannot reset a tenant to zero and hand back a ceiling it had already reached.
- **AC-13.6** The browser-only console keeps working with no API, no key and no
  project (AC-10.7). Durability must not cost the demo its independence.

### US-14 The overnight cycle runs, and runs once

As U1, the Briefing Pagi is there at 06:00 because something ran at 23:00, not
because someone opened a screen.

- **AC-14.1** The endpoint Cloud Scheduler and Pub/Sub already push to exists,
  accepts only a request bearing a valid OIDC token from the scheduler's service
  account, and refuses everything else — including an authenticated tenant user.
- **AC-14.2** A message delivered twice produces one night's work, not two. At
  least once is what Pub/Sub guarantees; exactly once is what the briefing needs.
- **AC-14.3** A cycle that fails is visible as a failure on the briefing timeline
  (AC-1.4) rather than as a briefing that is simply absent, and it reaches the
  dead-letter queue after the retries Terraform already configures.
- **AC-14.4** The cycle runs per tenant and one tenant's failure does not stop
  another's.
- **AC-14.5** A briefing that could not be generated says so on screen 02, naming
  what failed and when it was last successful. An empty screen is not an answer.

### US-15 A failure reaches a person

As U5, I find out from a notification, not from a tenant.

Two alert policies exist — the nightly cycle dead-lettering, and a tenant
crossing 90% of budget. Both are well chosen. Neither declares
`notification_channels`, which in Google Cloud means the alert opens an incident
in a console and notifies nobody. An alarm that does not sound is worse than no
alarm, because it is believed.

- **AC-15.1** Every alert policy has at least one notification channel that
  reaches U5 away from a desk, and the channel is created by Terraform rather
  than clicked into existence.
- **AC-15.2** Both existing policies keep their conditions and gain channels. A
  policy is added for the two failures they do not cover: the API returning
  errors at a sustained rate, and the API not answering at all.
- **AC-15.3** An uptime check calls `/healthz` on both services from outside the
  project, continuously — not once at the end of a deploy.
- **AC-15.4** The alert routing is tested by causing a failure and observing the
  notification arrive. An untested alert is an assumption.
- **AC-15.5** A stated availability target exists, with the window it is measured
  over, so "is it up?" has an answer that is not an opinion.

### US-16 A document can be read, not only held

As U2, I upload the SOP we actually have — a PDF — and the agent can cite it.

AC-10.12 made storing a document independent of reading it, which was correct:
a file LOKUS holds and honestly marks `menunggu-ekstraksi` is better than a file
it refuses or pretends to have understood. But almost every SOP in the world is a
PDF or a DOCX, so today's knowledge base can only read documents someone retyped.
T020 named the extractor, the chunker and the embedding model; none was built.
Retrieval is keyword scoring, which holds for sixty seeded passages and will not
hold for a tenant's real corpus — and the failure mode is quiet, because the 0.70
threshold turns a weak retriever into a system that refuses questions it should
have answered.

- **AC-16.1** A PDF or DOCX that lands under `menunggu-ekstraksi` leaves that
  state without being re-uploaded: its text is extracted, chunked and indexed,
  and the row reports its real chunk count.
- **AC-16.2** A document whose text cannot be extracted — a scan, a corrupt file,
  a password-protected one — says which of those it was and stays downloadable
  under AC-10.11. It never silently becomes an empty document that retrieval can
  match against.
- **AC-16.3** Retrieval runs against a vector index, and a passage's page number
  survives the change, because AC-4.2 requires a citation a reader can open.
- **AC-16.4** The refusal rule is unchanged: below 0.70 the answer is "tidak ada
  di dokumen" plus a logged gap. A better retriever must not become a reason to
  lower the threshold.
- **AC-16.5** The eval suite's citation-correctness gate is measured against the
  new retrieval path and still meets 0.90. A change to retrieval that improves
  recall and loses citations is a regression.

### US-17 The Google sources are the real ones

As U1, the review I am reading is a review a customer wrote.

Every number in the console today comes from a deterministic generator. The
adapters are honest about it — the Google ones throw rather than invent — and 001
chose this deliberately (Q1, and the Risks table). But the mitigation was to
*ship without it*, and there is no task anywhere that swaps a seeded adapter for
a real one. That work needs specifying, and one half of it cannot be hurried:
Business Profile starts every project at zero quota until Google approves an
access request, and that approval is measured in weeks.

- **AC-17.1** The Business Profile and Places adapters call Google, behind the
  same interfaces the seeded ones satisfy, so nothing above the adapter changes.
- **AC-17.2** An outlet's listing level is derived from what the credentials
  actually returned on the last run (AC-9.2) — now against real credentials,
  where the three levels are a fact rather than a fixture.
- **AC-17.3** Places responses stay cached per grid cell for 7 days, and the cache
  survives a restart, because the quota it protects is billed.
- **AC-17.4** Quota exhaustion, a revoked grant and an API outage each degrade to
  the state 001 already defines — needs-permission, or the last successful data
  named as stale — and never to invented data. Constitution I applies to an
  adapter exactly as it applies to an agent.
- **AC-17.5** Which source answered is visible: a screen reading live Google data
  says so, and a screen reading the seeded dataset says that instead. A reader
  never has to guess which system they are looking at.

### US-18 Spend has a limit that is not a promise

As U4, a mistake costs money once and then stops costing money.

Constitution V is implemented in code: per-tenant ceiling, degrade to Flash at
90%, refusal at the cap. That governs the model calls LOKUS knows it is making.
It governs nothing about the volume of requests arriving, and the API has no rate
limiting of any kind. One retry loop in a client, or one holder of a valid token
behaving badly, can call `/v1/agent/ask` without limit — and each call is a paid
model call before the budget guard ever sees it. There is also no billing budget
at the Google Cloud level, so the last line of defence is a line of JavaScript.

- **AC-18.1** Every route is rate limited per tenant and per user, with a tighter
  limit on the routes that call a model or a paid Google API. A refused request
  says it was rate limited and when to retry.
- **AC-18.2** A budget exists at the Google Cloud project level, with threshold
  notifications reaching U5, independent of any application code being correct.
- **AC-18.3** The in-code ceiling reads persisted spend (AC-13.5), so it survives
  the restart that currently resets it.
- **AC-18.4** Upload size, request body size and the number of documents a tenant
  may hold each have a stated limit, enforced while streaming rather than after.
- **AC-18.5** Cost per tenant per month is reported on screen 14 against the
  target in 001's success metrics, from measurement rather than estimate.

### US-19 Data survives a mistake, and says who did what

As U6, I ask what happens if someone deletes the wrong thing, and the answer is a
procedure that has been performed.

Firestore has delete protection in prod and the document bucket has versioning —
both good, and neither is a backup. Point-in-time recovery is off, there is no
scheduled export, and no restore has ever been attempted. A backup nobody has
restored is a belief. Separately, logs are structured and every line carries its
tenant id (Constitution IV, done well), but there is no retention policy, no
sink, and no separation between an operational log and the audit record of who
approved which public reply — which is the one record a tenant will ask to see.

- **AC-19.1** Point-in-time recovery is enabled and a scheduled export runs on a
  stated cadence.
- **AC-19.2** A restore has been performed into a scratch environment and the
  time it took is written down. That number, not the backup's existence, is what
  gets promised to a tenant.
- **AC-19.3** Recovery point and recovery time objectives are stated, and the
  backup cadence follows from them rather than the reverse.
- **AC-19.4** Audit-relevant events — approval and sending of a public reply, a
  document marked restricted, a role change, a tenant created — are written to a
  durable audit trail that is queryable per tenant and retained longer than
  operational logs.
- **AC-19.5** Log retention is set deliberately per class of log, and no log line
  carries a token, a secret, or the full text of a document.
- **AC-19.6** A tenant's operator can retrieve their own audit trail without an
  engineer running a query for them.

### US-20 Proven under the conditions it will meet

As U4, I know what breaks before a tenant finds it.

The test suite is genuinely strong — 27 component test files, 13 API test files,
coverage thresholds enforced in CI rather than reported, and 60 golden-set cases
gating the deploy. Three things it does not do: it never drives a real browser
against a running system, so the full sign-in-to-answer path is verified by hand
through `docs/demo-runbook.md`; nobody knows how many concurrent requests the API
survives; and the eval measures only the deterministic path, while the Vertex
path — the one a paying tenant would run on — is touched by a single smoke call.

- **AC-20.1** The critical journeys run end to end in a real browser against a
  deployed environment, in CI: sign in, choose a tenant, read the briefing,
  approve a reply, upload a document, ask a question and open its trace.
- **AC-20.2** A load test states the request rate the API sustains within the
  p95 latency the constitution already fixes at 10 s, and the number is recorded
  where a capacity decision can find it.
- **AC-20.3** The golden set runs against the Vertex reasoning path as well as the
  deterministic one, and both meet the same five thresholds. A rate limit
  degrades that job rather than invalidating the gate.
- **AC-20.4** A rollback is tested, not just documented — performed once against a
  deployed environment, with the time it took recorded.
- **AC-20.5** Tenant isolation is verified against the deployed system with two
  real tenants and two real identities, not only against injected requests.

### US-21 When it breaks, there is a procedure

As U5, at 03:00 I read a page rather than the source.

There is a runbook for the demo and nothing for an incident. The rollback command
is in `docs/deploy.md`, but no criterion says when to run it — and a decision
taken at 03:00 without a written criterion is a decision taken badly.

- **AC-21.1** A runbook covers the failures that are actually reachable: briefing
  missing, API down, model quota exhausted, Google credentials revoked, budget
  ceiling hit, bad revision deployed. Each names its symptom, its first check,
  its mitigation, and who to tell.
- **AC-21.2** Rollback has a criterion, not only a command.
- **AC-21.3** Every procedure is executable by one person with a laptop.
- **AC-21.4** A tenant-visible incident has a communication path, and the tenant
  is told before they ask.
- **AC-21.5** Each alert in US-15 links to the runbook section that answers it.

### US-22 A tenant's data has terms, and leaving is one of them

As U6, I can read what LOKUS does with our data and hold LOKUS to it.

LOKUS reads Google reviews. A review carries the reviewer's display name and
whatever they chose to write, which under UU PDP is personal data. The
constitution currently places out of scope "any handling of customer PII beyond
what Google returns publicly" — a sentence that was adequate for a hackathon and
is not adequate for a signed tenant, because what Google returns publicly *is*
personal data. Amending it is a governance act and belongs in this feature, not
in an implementation commit.

- **AC-22.1** A privacy policy and terms of service exist and are reachable from
  the console, naming the data processed, the purpose, the region and the
  retention period.
- **AC-22.2** Retention is enforced by the system rather than described by the
  document — data past its period is deleted on a schedule.
- **AC-22.3** Offboarding is a supported operation: a tenant's data can be
  exported and then deleted, with the deletion evidenced, including from backups
  within the stated window.
- **AC-22.4** All tenant data stays in `asia-southeast2` except where a service
  is not offered there — and each exception is named, with what it carries. The
  reasoning models are already such an exception and it is already recorded.
- **AC-22.5** The constitution's out-of-scope clause is amended to say what LOKUS
  actually does with review authors' data, and the amendment is a commit of its
  own with its reason and date.
- **AC-22.6** A subject access or deletion request arriving through a tenant has a
  procedure and a person, both written down.

## Success metrics

These replace nothing in 001. They measure the system, where 001's metrics
measure the product.

| Metric | Baseline today | Target |
|---|---|---|
| Data surviving a process restart | none | all of it |
| Briefings generated on time, last 30 days | not measured | above 95% |
| Time to restore from backup | never attempted | under 4 hours, measured |
| Alerts reaching a person | 0 of 2 policies | all of them |
| Documents a tenant can upload and have cited | `.txt`/`.md` only | PDF, DOCX and text |
| Sustained request rate within p95 < 10 s | unknown | measured and recorded |
| Tenants added without a deploy | 0 | all of them |

## Non-goals

Multi-region failover, a second cloud provider, SOC 2 or ISO certification,
customer-facing status page, autoscaling beyond what Cloud Run does by default,
and a second on-call person. Each may be right later; none is required for the
first paying tenant, and pretending otherwise would delay everything above.

## Open questions

- **Q4** Which environment is the first real one — is `prod` created directly, or
  does `staging` exist first? The answer changes AC-11.1 and how much AC-20
  can be tested before a tenant is on the system.
- **Q5** What retention period does the first tenant require, and does their
  contract demand anything stricter than `asia-southeast2` residency? AC-22.2
  cannot be built against a number nobody has chosen.
- **Q6** The constitution's out-of-scope clause on PII (AC-22.5) — amend it to
  describe what LOKUS does, or narrow what LOKUS does to fit it? The first is
  proposed. This is a governance decision and must be answered before any code
  under US-22 is written.
- **Q7** Business Profile API access remains 001's Q1 and is not resolved by this
  spec. Everything in US-17 that depends on approval must be sequenced so the
  rest of production readiness is not blocked behind it.
- **Q8** Who is U5 when the single operator is unreachable? "Nobody" is a valid
  answer for a pilot, but it must be a stated answer, because it sets the
  availability target in AC-15.5.
