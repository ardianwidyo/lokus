# Tasks: LOKUS Production Readiness

Format: `Txxx  description  [acceptance criterion]`
One commit per task, prefixed with the task id — the same rule 001 follows.

Numbering starts at **T080**, leaving a gap above 001's T071 so that feature can
still gain tasks without colliding with this one.

**P6 is optional before the 11 August submission and mandatory before the first
tenant who is not us** (Constitution, Development Workflow). Nothing here is on
the critical path to Demo Day, and no task below should be started at the cost
of one that is.

**Assumed for Q4 until told otherwise: two environments, `staging` and `prod`.**
T084 is the task that acts on that assumption, so it is the one to change if the
answer is `prod` only.

Two things separate these tasks from 001's. Point 2 of this feature's definition
of done — *proven against a deployed environment, not only against tests* — means
a task is not done when its code merges. And point 3 means any task introducing
a 03:00 failure mode ships with its runbook section and its alert; that is why
US-21 appears as a clause in other tasks rather than as a phase.

## P6.1 Ground

Nothing after this stage is observable without it. The notification channels come
first deliberately: every failure introduced later should announce itself, and
the cheapest moment to make that true is before there is anything to fail.

- **T080** Both existing alert policies reach a person. A
  `google_monitoring_notification_channel` in Terraform, referenced by the
  nightly-cycle dead-letter policy and the budget-degraded policy, which today
  declare none and therefore notify nobody. [AC-15.1, AC-15.2]
- **T081** The two failures no policy covers gain one each: the API answering
  with errors at a sustained rate, and the API not answering at all. Both route
  to the channel from T080. [AC-15.2]
- **T082** An uptime check calls `/healthz` on the API and on the console from
  outside the project, continuously — not once at the end of a deploy, which is
  the only check that exists today. [AC-15.3]
- **T083** The nightly-cycle endpoint exists. `POST /v1/internal/nightly-cycle`
  accepts only a request bearing a valid OIDC token from the scheduler's service
  account and refuses every other caller including an authenticated tenant user;
  it runs `runNightlyCycle`, which already exists in `packages/core`, per tenant,
  so one tenant's failure does not stop another's. Until this lands, the
  Terraform in `infra/scheduler.tf` pushes at an address the API does not define.
  Ships with its runbook section: *briefing missing*. [AC-14.1, AC-14.4]
- **T084** A message delivered twice produces one night's work. Pub/Sub
  guarantees at least once; the briefing needs exactly once, so the cycle records
  what it has already done for a given night and returns success rather than
  repeating it. [AC-14.2]
- **T085** A failed cycle is a visible failure rather than an absent briefing.
  The failure appears on the overnight timeline that AC-1.4 already defines, it
  reaches the dead-letter queue after the retries Terraform configures, and
  screen 02 states what failed and when the last success was — instead of the
  empty state, which here would be a lie. [AC-14.3, AC-14.5]
- **T086** The first `terraform apply`, into `staging`, with state in the remote
  backend rather than on a laptop. Done when a second apply immediately
  afterwards reports no changes: a clean re-plan is the only evidence that what
  is running matches what is written. [AC-11.1]
- **T087** Every secret container holds a version before the first revision
  starts, and a placeholder cannot survive into an environment that verifies real
  tokens — the deployment refuses rather than warning. [AC-11.2]
- **T088** A merge to `main` reaches the running services with no human step, and
  a revision failing its health check receives no traffic. The workflow exists
  (T057); this is the task that proves it against a real project. [AC-11.3]
- **T089** The environment states which it is — `dev`, `staging`, `prod` — on
  screen 14 and in `/healthz`, and a `prod` environment serving the seeded
  dataset is impossible rather than merely unlikely. [AC-11.5]
- **T090** Alert routing is proven by causing a failure and observing the
  notification arrive. An alert nobody has ever seen fire is an assumption, and
  this task is what turns T080 and T081 from configuration into a guarantee.
  [AC-15.4]
- **T091** An availability target with the window it is measured over, so "is it
  up?" has an answer that is not an opinion. Depends on Q8: "one operator, no
  backup, and the target says so" is a valid answer for a pilot provided it is
  written rather than implied. [AC-15.5]
- **T092** The console answers on a domain the tenant's staff can be told to
  trust, with `Strict-Transport-Security` set and `connect-src` narrowed from
  `https://*.run.app` — every Cloud Run service in the world — to the API's own
  origin. [AC-11.4]

## P6.2 Durability

Everything downstream assumes state survives the process. Each task below
replaces one memory implementation with a durable one behind the interface that
already exists, so the diff lands in `api/src/services/index.js` and a new
adapter file. A change outside those is the signal that the interface was wrong.

- **T093** The tenant guard moves down a level. A Firestore adapter whose
  primitives refuse a read or write that does not carry a tenant id, so isolation
  is enforced by the storage layer rather than by every caller remembering to —
  Constitution IV one level below where 001 applied it. [AC-13.4]
- **T094** Tickets and approvals in Firestore. The approval record is the one
  Constitution II requires be auditable, and today it is a variable that Cloud
  Run discards when it stops an idle instance. [AC-13.1]
- **T095** Agent runs in Firestore, beside the Agent Engine sessions that already
  hold part of this. Where the two disagree about what a run is, the answer is
  written down rather than left to whichever store was asked. [AC-13.1]
- **T096** Documents split correctly: metadata in Firestore, bytes in Cloud
  Storage, and the download a V4 signed URL rather than a proxied stream — the
  production path AC-10.11 already specifies. [AC-13.1, AC-13.2]
- **T097** The BigQuery warehouse, running the SQL already committed in
  `infra/sql/` rather than a query builder that would fork it. The memory
  warehouse stays: it is what tests and the browser-only demo use. [AC-13.3]
- **T098** Month-to-date spend is read from storage on boot, so a restart cannot
  hand a tenant back a ceiling it had already reached. [AC-13.5]
- **T099** Proof, and the point of the phase: a restart in a deployed
  environment leaves the tickets, approvals, runs and documents where they were —
  and the browser-only console still runs with no API, no key and no project, as
  AC-10.7 requires. Durability must not cost the demo its independence.
  [AC-13.1, AC-13.6]

## P6.3 Identity

Needs P6.2, because a stored tenant directory needs somewhere to be stored.

- **T100** Identity Platform provisioned and the console signs in for real —
  Google account or email link — replacing the two `NOT_IMPLEMENTED` refusals in
  `web/src/data/httpSources.js`. No screen mints a token for itself after this.
  [AC-12.1]
- **T101** Tenants and memberships are stored, not compiled. An admin action
  creates a tenant and invites a member, writing Firestore and then setting the
  custom claim through the Admin SDK — the claim being a cache of Firestore and
  never the reverse. Onboarding stops requiring an edit, a review and a deploy.
  [AC-12.3]
- **T102** The absence of dev auth is asserted rather than assumed. The
  environment reports which auth mode it verifies under, and the deploy fails if
  that is anything but real token verification. Today the mode refuses to boot in
  production, which is a fence; this is the door being checked. [AC-12.2]
- **T103** Revoking a membership takes effect within one token lifetime, and the
  lifetime is stated — one hour, Identity Platform's default — rather than
  inherited by accident. [AC-12.4]
- **T104** Every isolation rule 001 proved against the seeded directory is proved
  against the stored one, by the same tests: no cross-tenant read, role enforced
  server-side, and a tenant outside the membership map refused identically
  whether or not it exists. [AC-12.5]

## P6.4 Corpus

Needs P6.2, because extraction needs the bytes to be somewhere.

- **T105** T020, finally. A PDF or DOCX leaves `menunggu-ekstraksi` without being
  re-uploaded: text layer via `pdfjs-dist`, DOCX via `mammoth`, chunked 800/120
  as planned, and the row reports its real chunk count. [AC-16.1]
- **T106** A document whose text cannot be extracted says which failure it hit —
  a scan, a corrupt file, a password — and stays downloadable under AC-10.11. It
  never becomes an empty document that retrieval can match against, which is the
  failure mode worth designing away rather than handling. Document AI is a
  per-document action with its cost visible, never an automatic fallback.
  [AC-16.2]
- **T107** Retrieval moves to Vertex AI Search with `text-embedding-004`, and a
  passage's page number survives the move, because AC-4.2 requires a citation a
  reader can open. The tenant is told about the residency exception recorded in
  `plan.md` before their corpus is indexed, not after. [AC-16.3]
- **T108** The refusal rule is unchanged and proven so: below 0.70 the answer is
  still "tidak ada di dokumen" plus a logged gap. A better retriever must not
  become an argument for a lower threshold. [AC-16.4]
- **T109** The eval suite's citation-correctness gate is re-measured against the
  new retrieval path and still meets 0.90. A retrieval change that improves
  recall and loses citations is a regression, and the golden set is what says so.
  [AC-16.5]

## P6.5 Limits

Protects everything above it, and is worth nothing before there is something to
protect. Two halves: what stops a mistake costing money, and what survives a
mistake that already happened.

- **T110** Rate limiting per tenant and per user, tighter on the routes that call
  a model or a paid Google API, with a refusal that says it was rate limited and
  when to retry. The limit is per instance and therefore approximate; the
  effective ceiling — `limit × api_max_instances` — is displayed on screen 14 so
  it is a number someone chose. Ships with its runbook section: *rate limit
  reached*. [AC-18.1]
- **T111** A budget at the Google Cloud project level, with threshold
  notifications reaching the channel from T080, independent of any application
  code being correct. Today the only ceiling is a line of JavaScript. [AC-18.2]
- **T112** The in-code ceiling reads the persisted spend from T098, so it
  survives the restart that currently resets a tenant to zero. [AC-18.3]
- **T113** Upload size, request body size, and the number of documents a tenant
  may hold each have a stated limit enforced while streaming rather than after —
  extending the ceiling T071 already enforces mid-stream to the two limits that
  have none. [AC-18.4]
- **T114** Cost per tenant per month is reported on screen 14 from measurement
  rather than estimate, against the target in 001's success metrics. [AC-18.5]
- **T115** Point-in-time recovery enabled and a scheduled export running on a
  stated cadence. Delete protection and bucket versioning already exist and are
  neither of them a backup. [AC-19.1]
- **T116** A restore performed into a scratch environment, with the time it took
  written down. That number is what gets promised to a tenant — the backup's
  existence is not a promise anyone can keep. Ships with its runbook section:
  *restore from backup*. [AC-19.2]
- **T117** Recovery point and recovery time objectives stated, with the backup
  cadence following from them rather than the reverse. [AC-19.3]
- **T118** An audit trail that is a trail: approval and sending of a public
  reply, a document marked restricted, a role change, a tenant created — durable,
  queryable per tenant, and retained longer than operational logs, in its own
  collection and its own sink rather than as a filter over debug output.
  [AC-19.4]
- **T119** Log retention set deliberately per class of log, and no log line
  carrying a token, a secret, or the full text of a document. [AC-19.5]
- **T120** A tenant's operator retrieves their own audit trail without an
  engineer running a query for them. [AC-19.6]

## P6.6 Proof

Requires a real environment and a real identity, which is why it is here rather
than earlier. Closes the parts of US-21 that could not be written per task.

- **T121** The critical journeys run end to end in a real browser against a
  deployed environment, in CI: sign in, choose a tenant, read the briefing,
  approve a reply, upload a document, ask a question, open its trace. This is
  what `docs/demo-runbook.md` does by hand today. [AC-20.1]
- **T122** A load test states the request rate the API sustains within the p95
  latency the constitution fixes at 10 s, recorded where a capacity decision can
  find it. Nobody currently knows this number. [AC-20.2]
- **T123** The golden set runs against the Vertex reasoning path as well as the
  deterministic one, and both meet the same five thresholds. A rate limit
  degrades that job rather than invalidating the gate — the same rule the live
  model smoke already follows. [AC-20.3]
- **T124** A rollback performed against a deployed environment and timed, and the
  criterion for running one written beside the command that runs it. A decision
  taken at 03:00 without a written criterion is taken badly. [AC-20.4, AC-21.2]
- **T125** Tenant isolation verified against the deployed system with two real
  tenants and two real identities, not only against injected requests. [AC-20.5]
- **T126** The runbook is assembled from the sections the earlier tasks wrote,
  and gains the two things no single task could: the path for telling a tenant
  about an incident before they ask, and the index pointing each alert at the
  section that answers it. Every procedure in it is executable by one person with
  a laptop — a procedure needing a second pair of hands at 03:00 is rejected, not
  documented. [AC-21.1, AC-21.3, AC-21.4, AC-21.5]

## P6.7 Terms

Needs P6.5, because deletion has to be machinery before it can be a promise.

- **T127** A privacy policy and terms of service, reachable from the console,
  naming the data processed, the purpose, the region and the retention period.
  [AC-22.1]
- **T128** Retention enforced by the system rather than described by the
  document: data past its period is deleted on a schedule. Blocked on Q5 for its
  number only — the machinery is built against a configured `retention_days`.
  [AC-22.2]
- **T129** Offboarding as a supported operation: a tenant's data exported, then
  deleted, with the deletion evidenced, including from backups within the stated
  window. [AC-22.3]
- **T130** Every residency exception named with what it carries. Two exist —
  the reasoning models, and Vertex AI Search holding the corpus — and the second
  is the heavier one. [AC-22.4]
- **T131** A subject access or deletion request arriving through a tenant has a
  procedure and a person, both written down. [AC-22.6]

AC-22.5 has no task: the constitution was amended on 2026-08-08 (1.1.0,
Principle VIII), which is what that criterion asked for.

## P6.X Google sources — not sequenced

Off the critical path on purpose. Business Profile starts every project at zero
quota until Google approves the request, and that approval is measured in weeks.
A plan that sequences these tasks stops the whole effort in somebody else's
queue; everything above completes on the seeded adapters.

- **T132** Request Business Profile API access. Not a code task, and the first
  thing to do on the first day of P6 regardless of which stage is being worked —
  the queue starts when the request is filed, not when the adapter is ready.
- **T133** The Places adapter calls Google behind the interface the seeded one
  satisfies, and the 7-day grid-cell cache survives a restart, because the quota
  it protects is billed. [AC-17.1, AC-17.3]
- **T134** The Business Profile adapter calls Google, and an outlet's listing
  level is derived from what real credentials actually returned on the last run —
  the three levels of US-9 becoming a fact rather than a fixture. [AC-17.2]
- **T135** Quota exhaustion, a revoked grant and an API outage each degrade to a
  state 001 already defines — needs-permission, or the last successful data named
  as stale — and never to invented data. Constitution I applies to an adapter
  exactly as it applies to an agent. Ships with its runbook section: *Google
  credentials revoked*. [AC-17.4]
- **T136** Which source answered is visible: a screen reading live Google data
  says so, and one reading the seeded dataset says that instead. A reader never
  has to guess which system they are looking at. [AC-17.5]
