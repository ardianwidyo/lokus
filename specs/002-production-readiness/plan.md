# Implementation Plan: LOKUS Production Readiness

Covers `specs/002-production-readiness/spec.md`, US-11 to US-22. The product
plan is `specs/001-lokus-core/plan.md` and is not superseded — every stack
choice there stands. This plan decides how the seams 001 left get their second
implementation, and names the few things that must be added outright.

## What is already decided, and therefore not re-litigated

001 built every external dependency behind one interface with a memory
implementation behind it. That was not a shortcut deferred; it was the shape
this work needs. So the question below is never "what database" — 001 answered
that — but "what does the durable implementation of an interface that already
exists look like, and what does it cost to be wrong".

| Interface | Exists in | Memory impl today | Durable impl to write |
|---|---|---|---|
| `runStore` | `packages/core/src/agents/runStore.js` | `createMemoryRunStore` | Firestore (Agent Engine sessions already cover part of this) |
| `ticketStore` | `packages/core/src/agents` | `createMemoryTicketStore` | Firestore |
| warehouse | `packages/core/src/pipeline/warehouse.js` | `createMemoryWarehouse` | BigQuery, running `infra/sql/` |
| knowledge store | `packages/core/src/knowledge/ingest.js` | in-process maps | Firestore metadata + Cloud Storage bytes |
| `searchPassages` | `packages/core/src/knowledge/retrieval.js` | keyword scoring | Vertex AI Search |
| approvals | `packages/core/src/reputation/approvals.js` | memory | Firestore + audit sink |
| budget | `packages/core/src/cost/budget.js` | memory, seeded | Firestore |
| tenant directory | `api/src/repositories/tenantDirectory.js` | seeded array | Firestore |
| `gbp`, `places` | `packages/core/src/adapters/` | seeded generators | Google APIs (US-17, externally blocked) |

Every row lands in `api/src/services/index.js` and in a new adapter file. No
screen, no route and no agent changes because a store became durable — if one
does, the interface was wrong and that is the finding, not the diff.

## Stack additions

Only what 001 does not already carry. Everything else — React, Fastify, Cloud
Run, Terraform, Gemini via Vertex, `asia-southeast2` — is unchanged.

| Layer | Choice | Why this and not the other one |
|---|---|---|
| Firestore client | `@google-cloud/firestore` | first-party, ADC-authenticated, no key |
| BigQuery client | `@google-cloud/bigquery` | runs the SQL already written in `infra/sql/` rather than a query builder |
| Object storage | `@google-cloud/storage`, V4 signed URLs | AC-10.11 already specifies signed rather than proxied |
| Rate limiting | `@fastify/rate-limit`, per instance | see "Rate limiting is approximate on purpose" |
| PDF text | `pdfjs-dist` | text-layer extraction, no native build, same library Firefox ships |
| DOCX text | `mammoth` | DOCX only, small, no conversion service |
| Scanned pages | Document AI, **only** when no text layer exists | billed per page; most SOPs have a text layer and must not pay OCR prices |
| Retrieval | Vertex AI Search + `text-embedding-004` | as 001 planned; residency exception recorded below |
| E2E | Playwright | drives a real browser against a deployed URL, which is the whole point |
| Load test | `autocannon` | Node, so CI keeps one runtime — same reasoning as the eval runner |
| Backup | Firestore PITR + scheduled export to GCS | export is what survives a bad migration; PITR is what survives a bad hour |
| Alert delivery | `google_monitoring_notification_channel` + uptime check | Terraform, not clicked |

Four dependencies are added to the API and one to a new extraction path.
`CLAUDE.md` requires the reason be written here rather than discovered in a diff,
so: the three Google clients replace hand-rolled REST calls to services whose
auth, retry and pagination semantics are not worth reimplementing;
`@fastify/rate-limit` is the Fastify organisation's own plugin, and a rate
limiter is a place where a bug is a denial-of-service; `pdfjs-dist` and
`mammoth` are the smallest things that read the two formats a tenant actually
has.

## Identity: one project, memberships in claims

Identity Platform offers its own multi-tenancy, and LOKUS must not use it.

Its tenants isolate *users*: an account belongs to one tenant and cannot be
resolved from another. But U4 is the EBCO delivery team, who operate several
client tenants from one deployment with one account — the exact thing spec 001
AC-6.3 describes, with a role per tenant shown at selection. Identity Platform
multi-tenancy would require a separate account per client, which is not the
product.

So: **one Identity Platform project, one user record per person, memberships as
a custom claim** — which is exactly the token shape `api/src/auth/verifyIdToken.js`
already verifies (`roles` as a `tenantId → role` map, `tenantId` as the default).
The verifier does not change. What is added is the thing that mints those claims:

- Firestore holds the source of truth (`tenant`, `membership`).
- An admin action writes the membership and sets the custom claim through the
  Admin SDK.
- The claim is a cache of Firestore, never the reverse. A token outlives a
  revocation by at most its lifetime, which AC-12.4 requires be stated rather
  than inherited: **one hour**, Identity Platform's default, and short-lived
  enough that no revocation path needs to force a sign-out.

## Rate limiting is approximate on purpose

`@fastify/rate-limit` keeps counters in the instance by default. Cloud Run runs
N instances, so a per-instance limit of L is really a global limit of up to
`L × max_instance_count`. The exact fix is a shared store — Memorystore for
Redis — which costs more per month than the entire pilot's compute and is a
second stateful service for one person to operate.

The decision: **per-instance limits, with `api_max_instances` bounded in
Terraform, and the arithmetic written on screen 14** so the effective ceiling is
a number someone chose rather than a number nobody computed. Move to a shared
store when a tenant's traffic makes the approximation matter — that is a
capacity decision with evidence, not a guess made now.

This is enough because of what the limit is for. It is not fairness between
users; it is stopping a runaway loop from spending money. The paid calls are
already double-guarded by the per-tenant budget (Constitution V), and the rate
limit's job is to make the budget the second line of defence rather than the
first.

## Residency has one more exception, and it must be named

Constitution VIII and AC-22.4 promise `asia-southeast2` except where a service
is not offered there, each exception named with what it carries. One exception
already exists and is recorded in 001: the Gemini models are not served from
`asia-southeast2`, so reasoning calls leave the region.

Vertex AI Search is the second. Its data stores are `global`, `us` or `eu` —
there is no Jakarta. That is more serious than the model exception, because a
model call carries a passage for the length of one request while a search data
store *holds the corpus*. A tenant's SOP is not customer personal data, which
narrows the exposure but does not remove the obligation to say so.

Three options, and the plan takes the first:

1. **Vertex AI Search with the exception declared** to the tenant before their
   corpus is indexed, and a documented refusal path: a tenant who will not
   accept it gets keyword retrieval, degraded and labelled, rather than silent
   non-compliance.
2. Embeddings in `asia-southeast2` with vectors in Firestore and a
   nearest-neighbour scan — correct on residency, and it does not scale past a
   few thousand chunks.
3. Vertex AI Vector Search — index endpoints bill continuously whether queried
   or not, which contradicts a pilot that scales to zero.

`searchPassages` stays one interface with three possible implementations, so
this is a configuration decision per tenant rather than a rewrite.

## Extraction: cheap path first, OCR only when there is no alternative

A PDF with a text layer is a parsing problem. A scanned PDF is an OCR problem
and costs per page. Running everything through Document AI would be simpler to
write and would bill a tenant for OCR on documents that never needed it.

So: try the text layer; if it yields nothing meaningful, the document does not
silently become empty — AC-16.2 requires it say which failure it hit. Document
AI is then an explicit, per-document action with its cost visible, not an
automatic fallback that quietly converts a storage bill into a processing bill.

A document that fails extraction stays downloadable (AC-10.11) and stays out of
the indexed count, the coverage figure and retrieval — exactly the exclusions
`menunggu-ekstraksi` already enforces. Extraction changes a document's state; it
never changes what an unextracted document is allowed to claim.

## Data model additions

Extends the 001 model rather than replacing it.

```
membership(user_id, tenant_id, role, granted_by, granted_at, revoked_at)
tenant(... 001 fields ..., region, retention_days, status, offboarded_at)
audit_event(id, tenant_id, actor_user_id, action, subject_type, subject_id,
       at, request_id, detail{})        -- action: reply.approved | reply.sent |
                                        -- document.restricted | role.changed |
                                        -- tenant.created | data.exported |
                                        -- data.deleted
document(... 001 fields ..., gcs_object, bytes, checksum, extracted_at,
       extraction_error)                -- index_state gains nothing; T071's
                                        -- menunggu-ekstraksi already covers it
spend(tenant_id, month, idr, updated_at)
places_cache(cell, fetched_at, payload) -- 7-day TTL, survives restart (AC-17.3)
```

`audit_event` is a separate collection *and* a separate log sink, not a filter
over the operational log. Constitution II requires the approval record be
auditable; a record that ages out with the debug logs is not.

## Environments

Answers Q4 with a proposal: **two**.

`staging` exists so AC-20.1 (browser journeys), AC-20.4 (a rollback actually
performed) and AC-19.2 (a restore actually performed) have somewhere to happen
that is not a tenant's system. Both scale to zero, so an idle staging costs
approximately nothing, and the Terraform is already parameterised by
`var.environment`.

`prod` holds no seeded dataset. AC-11.5 makes the environment state itself, and
"this is production and it is showing you generated reviews" must be impossible
rather than merely unlikely.

## Phases

P6 runs after 001's P5, and is mandatory before the first tenant who is not us
(Constitution, Development Workflow). Ordering is not preference — each stage
makes the next one observable.

| Stage | Scope | Stories | Why here |
|---|---|---|---|
| **P6.1 Ground** | apply Terraform, secret versions, notification channels, uptime check, the nightly-cycle endpoint | US-11, US-14, US-15 | nothing after this is observable without it; the alert channels come first so every later failure announces itself |
| **P6.2 Durability** | Firestore, BigQuery, Cloud Storage behind the existing interfaces | US-13 | everything downstream assumes state survives |
| **P6.3 Identity** | Identity Platform, stored tenants and memberships, console sign-in | US-12 | needs P6.2 for the directory to live anywhere |
| **P6.4 Corpus** | extraction, vector retrieval, eval re-run | US-16 | needs P6.2 for the bytes to be somewhere |
| **P6.5 Limits** | rate limiting, cloud-level budget, backup and restore drill, log retention and audit sink | US-18, US-19 | protects everything above it, and is worth nothing before there is something to protect |
| **P6.6 Proof** | Playwright journeys, load test, eval on the Vertex path, rollback drill, isolation against two real identities | US-20 | requires a real environment and a real identity to be honest |
| **P6.7 Terms** | privacy policy, enforced retention, offboarding export and delete | US-22 | needs P6.5's deletion machinery to be more than a promise |
| **P6.X Google** | real Business Profile and Places adapters | US-17 | **not sequenced** — blocked on an approval nobody here controls |

P6.X is deliberately outside the chain. Business Profile starts at zero quota
until Google approves, and a plan that puts it in the middle of the sequence
stops the entire effort on somebody else's queue. The request goes in on day
one; the adapter is written whenever the approval lands.

**P6.1 first, and quickly.** Two of its items — the nightly-cycle endpoint and
the notification channels — are the difference between an applied environment
that silently fails every night and one that says so.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| First `terraform apply` uncovers quota, ordering or IAM gaps | apply to `staging` first; the same code applies to `prod` with one variable changed |
| Durability rewrite leaks into the domain | the interfaces are already there and tested against memory; a change outside `api/src/services/index.js` and the new adapters is a signal the interface was wrong |
| Firestore cost from per-request writes | rate-limit counters stay out of Firestore (see above); spend is written on change, not per call |
| Vertex AI Search residency unacceptable to a tenant | keyword retrieval stays behind the same interface, degraded and labelled; the tenant is told before indexing, not after |
| Business Profile approval never arrives | P6.X is off the critical path; every other story completes on seeded adapters, and AC-17.5 makes which source answered visible |
| Extraction bills more than it saves | Document AI is per-document and explicit, never an automatic fallback |
| One operator, no second pair of hands | AC-21.3 makes it a rejection criterion: a procedure needing two people is not accepted |
| Retention deletes something a tenant still needed | export precedes delete in the offboarding path, and AC-19.2's restore drill is what proves the export is real |
| Production readiness delays the 11 August submission | P6 is explicitly optional before the submission and mandatory after; nothing in 001's mandatory phases depends on it |

## Recorded deviations

- **2026-08-08 · Vertex AI Search is not available in `asia-southeast2`.**
  001's stack table lists it as the retrieval layer without naming a region, and
  Constitution VIII now requires each residency exception be named with what it
  carries. This one carries the tenant's document corpus, which is more than the
  model exception carries. Recorded here rather than discovered at index time,
  with the refusal path and the two rejected alternatives above.

- **2026-08-08 · rate limiting is per instance, not global.** The exact
  implementation needs a shared store whose monthly cost exceeds the pilot's
  entire compute. The effective ceiling is `limit × api_max_instances`, both
  values are in Terraform, and the product of them is displayed on screen 14 so
  it is a chosen number. Revisit when measured traffic makes the approximation
  material.

- **2026-08-08 · Identity Platform multi-tenancy is not used.** Its tenants
  isolate users, and U4 is one person operating several client tenants from one
  account. Memberships stay custom claims over a single project, which is the
  token shape the verifier already implements.

## Definition of done (per task)

001's definition governs the product. This one governs the system, and differs
on the second line, which is the whole point of the feature.

1. Committed with its task-id prefix.
2. **Proven against a deployed environment, not only against tests.** A durable
   store is proven by a restart; an alert by a notification that arrived; a
   backup by a restore; a rollback by a rollback. A green test suite is
   necessary and is not evidence that any of these work.
3. If the task introduces something that can fail at 03:00, it ships with its
   runbook section and its alert, and the alert links to the section (AC-21.5).
4. Tenant isolation still holds, verified the way US-20 requires rather than
   assumed from 001.
5. `docs/production-readiness.md` is updated as items close, so the audit stays
   a description of the system rather than a snapshot of one day. An item is
   struck when it is proven under point 2, not when its code merges.

## Open questions carried from spec.md

- **Q4 environments** — proposed above: `staging` and `prod`. Confirm before
  P6.1, because it changes what the first `apply` creates.
- **Q5 retention period** — blocks AC-22.2 only. Everything else in P6.7 can be
  built against a configured `retention_days` whose value arrives later.
- **Q6 constitution** — **resolved 2026-08-08**, Principle VIII added, PII clause
  removed from Out of Scope, constitution 1.1.0.
- **Q7 Business Profile access** — unchanged from 001's Q1. Handled by taking
  US-17 off the critical path rather than by answering it.
- **Q8 who is U5's backup** — blocks only AC-15.5's availability target. "Nobody,
  and the target says so" is an acceptable answer for a pilot and must be
  written down as one.
