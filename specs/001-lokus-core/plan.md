# Implementation Plan: LOKUS Core

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite | single stylesheet: `design/tokens.css`; copy from `web/src/i18n` |
| Domain | `packages/core` — plain JS, no cloud SDK | theme clustering, guardrails, draft assembly, scoring, seeded dataset |
| API | Cloud Run (Node 20 + Fastify) | Identity Platform auth, RBAC middleware |
| Agents | supervisor + 3 specialised agents in `packages/core` | Vertex AI Agent Engine needs billing; see the 2026-07-30 deviation |
| Models | Gemini (reasoning), Gemini Flash (bulk) via Vertex AI REST | **wired** on `ebco-aihack-ardian`, ADC-authenticated, falls back to deterministic drafting |
| Retrieval | keyword scoring in `packages/core`, threshold 0.70 | Vertex AI Search + `text-embedding-004` needs billing; chunking is 800/120 as planned |
| Analytics | deterministic JS over the seeded dataset | BigQuery + GIS needs billing; the queries it replaces are named in the trace |
| State | Firestore | tenants, tickets, agent runs/traces |
| Docs | Cloud Storage | source SOP/catalog files |
| External | Business Profile API v4, Places API (New), Business Profile Performance API | adapters behind one interface each; see "External review sources" below |
| Scheduling | Cloud Scheduler → Pub/Sub | nightly cycle 23:00, briefing by 06:00 |
| Ops | Terraform, GitHub Actions, Cloud Logging + Trace, Secret Manager | region `asia-southeast2` |

## External review sources

`gbp.listReviews` and `gbp.reply` are one interface over two Google APIs that
are not interchangeable. Which one answers depends on the outlet's listing level
(spec US-9), so the table above lists all three deliberately:

| API | Serves | Access | Used for |
|---|---|---|---|
| Business Profile API v4 `accounts.locations.reviews` | full review history, paginated; reply write | OAuth `business.manage` from the managing account, on a project Google has allowlisted — quota is zero until approved | L2 outlets: everything |
| Places API (New) `places.get` with `reviews` in the field mask | at most 5 reviews, chosen by Google, read-only | API key | L1 outlets: read-only reputation signal |
| Business Profile Performance API | impressions, calls, direction requests | same OAuth as v4 | location factors, **not reviews** |

The Performance API carries no review content and cannot reply — an earlier
draft of this plan named it as the review source, which it never was.

## Agent contracts

See `contracts/agent-tools.json` for the JSON schemas.

```
supervisor   route(intent) → delegate, merge, enforce guardrails, persist trace
reputation   gbp.listReviews, gbp.reply, bq.themeCluster, bq.ratingTrend
location     places.nearbyCompetitors, bq.locationScore, bq.cannibalisation
knowledge    rag.search, rag.cite, kb.ingest, kb.gapReport
```

Rules: every tool returns `{data, sources[], latencyMs}`; the supervisor refuses
to emit a claim whose `sources` array is empty; every step is appended to the
`agent_run.steps` array before the next step starts.

## Data model (essentials)

```
tenant(id, name, plan, budget_idr, model_tier)
user_role(user_id, tenant_id, role)                     -- admin|manager|viewer
outlet(id, tenant_id, code, name, geo, opened_at, manager, gbp_location_id)
review(id, tenant_id, outlet_id, rating, text, author, published_at,
       reply_state, reply_text, approved_by, themes[])   -- reply_state: none|draft|approved|sent
theme_rollup(tenant_id, outlet_id, theme, week, count, delta, systemic)
location_score(outlet_id, total, factors{traffic,mix,competitors,access},
       weights{}, computed_at)
candidate(id, tenant_id, name, geo, total, factors{}, nearest_own_km, verdict)
document(id, tenant_id, title, type, pages, index_state, updated_at, restricted)
answer(id, tenant_id, question, text, citations[{doc_id,page,score,quote}],
       rejected_chunks, confidence)
ticket(id, tenant_id, source_insight_id, title, outlet_id, owner, status,
       due_at, impact)                                   -- status: baru|dikerjakan|menunggu|selesai
agent_run(id, tenant_id, intent, steps[{n,tool,args_digest,result_size,ms}],
       latency_ms, cost_idr, guardrail{checks[],passed})
knowledge_gap(id, tenant_id, question, occurrences, proposed_clause)
```

## Localisation

US-8. Two locales, `id` (default) and `en`. The interesting part is not the
mechanism but where the boundary falls: `packages/core` writes two different
kinds of string, and only one of them is translatable.

```
web/src/i18n/          console chrome and static screen copy
packages/core/src/i18n/  agent-authored copy — labels, reasons, verdicts, conclusions
(nowhere)              tenant content — review text, SOP passages, public replies
```

- **One dictionary pair per layer**, `messages.id.js` and `messages.en.js`, keyed
  by dotted path. `createTranslator` in `packages/core/src/i18n/translate.js` is
  shared by both layers, so there is one interpolation implementation, not two.
  Indonesian remains the canonical copy: it comes from `design/SCREENS.md` and
  English is written against it.
- **Locale is a parameter, never ambient.** Core functions take
  `locale = DEFAULT_LOCALE`; nothing reads a module-level global. That keeps the
  domain pure and lets one API process serve both locales concurrently.
- **The locale travels on the request** (AC-8.4): the console sends
  `Accept-Language`, `plugins/locale.js` normalises it against the two supported
  values, and route handlers pass `request.locale` into the services. An
  unrecognised or absent header is Indonesian, never an error.
- **Errors travel as codes, not as prose.** `TicketError`, `LocationScoreError`,
  `DecisionApprovalError` and the rest keep their Indonesian `message` as a
  developer-facing default and are *not* threaded with a locale — a throw site
  four calls deep should not need to know who is reading. The console translates
  on `error.code`, which is already stable and already what the panel layer
  switches on, and falls back to `error.message` for a code it has no copy for.
  That way a new domain error surfaces readable Indonesian instead of a blank
  panel, and adding its English copy is a dictionary edit with no core change.
- **Formatting is locale-aware, not string surgery.** `lib/format.js` keeps its
  `idNumber` / `idFactor` / `idInteger` names as Indonesian-bound wrappers, and
  the new `localeNumber` / `localeFactor` / `localeInteger` / `localeDate` take
  the locale. The `.replace('.', ',')` calls scattered through the screens go.
- **Model output is out of scope on purpose.** The Gemini prompts stay
  Indonesian: a reply is read by an Indonesian customer, and the grounding guard
  in `knowledge/groundedWriter.js` matches an Indonesian refusal sentinel. Asking
  the model to answer in English would put the guard and the eval golden set on a
  language the rest of the layer does not expect, for no operator benefit
  (AC-8.5).

A finding that carries prose the code later re-parses is the failure mode this
work exposes: `agents/answerActions.js` recovered the leading theme with
`/adalah ([A-Za-z\s]+):/` over an Indonesian sentence. Findings now carry
`themeId` and the regex is gone — copy is for readers, ids are for code.

## Phases

| Phase | Scope | Mandatory |
|---|---|---|
| **P0 Foundation** | Terraform baseline, auth + tenant claim, RBAC middleware, CI green, UI shell with 14 routes and the four shared state components | yes |
| **P1 Reputation** | review ingest → theme cluster → draft reply + approval flow; screens 05, 06, 07 | yes |
| **P2 Knowledge** | doc ingest → RAG with page citations → gap report; screens 11, 12 | demonstrable |
| **P3 Location** | Places ingest + cache → location score → Site Scout; screens 03, 04, 08, 09 | demonstrable |
| **P4 Orchestration** | supervisor agent, chat UI with inline trace, nightly cycle → Briefing Pagi; screens 02, 10 | yes |
| **P5 Hardening** | eval suite in CI, cost ceiling + degradation, four UI states everywhere, Admin screen, demo script, README | yes |

Suggested order under time pressure: P0 → P1 → P4 → P2 → P3 → P5, with P5 items
folded in continuously rather than left to the end.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Business Profile API access delayed | ship with a seeded dataset behind the same adapter interface; swap when access lands |
| Pilot outlets not claimed, or absent from Maps entirely | listing levels in spec US-9: the Reputation agent degrades to the 5 read-only Places reviews at L1 and to nothing at L0, says which it is, and never offers a reply it has no authority to send |
| Places quota / cost | cache POI responses per grid cell for 7 days; Site Scout may run on cached data |
| Model cost overrun | per-tenant ceiling in code, degrade to Flash at 90%, alert |
| Non-developer team | every task in `tasks.md` names its acceptance criterion so the coding agent has an unambiguous target |
| Demo failure | record a 3-minute video as a fallback; demo always runs on the deployed URL |
| Domain logic duplicated between API and seeded UI | one `packages/core` workspace holds it; the API wraps it in HTTP + auth, the seeded web adapter calls it directly. Logic is written and tested once |

## Recorded deviations

- **2026-07-29 · `packages/core` workspace added.** Theme clustering, guardrail
  checks, draft assembly and location scoring are needed both by the Cloud Run
  API and by the web console when it runs on the seeded dataset (Q1). A shared
  plain-JS workspace keeps one implementation and one test suite instead of
  two. No new external dependency; it is repository structure, not stack.
- **2026-07-29 · eval runner is `eval/run_eval.mjs`, not `run_eval.py`.**
  `tasks.md` T050 names a Python runner, but Python appears nowhere in the
  stack table above and the entire system under test is JavaScript. A Python
  harness would have to shell out to Node for every case, and CI would carry a
  second language runtime and a second dependency manager to run assertions on
  a JS library. The runner is written in Node, imports `@lokus/core` directly,
  and keeps the golden set in the JSONL format T050 specifies. Thresholds are
  unchanged: they come from the constitution's quality gates, not from the
  runner's language.
- **2026-07-29 · local development auth mode.** `LOKUS_AUTH_MODE=dev` lets the
  API mint a local principal so the console is runnable end to end before
  Identity Platform is provisioned for the pilot tenant (Q1 still open). The
  server refuses to start if this mode is set while `NODE_ENV=production`, and
  every request served under it is logged as such. Production is unaffected:
  the default mode remains Identity Platform token verification.
- **2026-07-29 · screen 04 charts 8 weeks, not 12.** `design/SCREENS.md` labels
  the chart "RATING 12 PEKAN", but the seeded review window is `TREND_WEEKS`
  (8) — the same window screens 05 and 07 read. Drawing twelve would mean
  inventing four weeks of ratings for a chart whose entire job is to show a
  real decline, and the number of weeks is the one thing on that chart nobody
  would think to verify. The chart draws the weeks that exist and labels itself
  with that count.
- **2026-07-29 · the change-point line marks an event, not a cause.**
  `design/SCREENS.md` puts "28 Jun · pesaing baru buka" on the Bekasi Timur
  chart. In the Places response the only opening in the window is at Depok
  Margonda (Mitra Mart Margonda, 28 Jun, 400 m); Bekasi Timur has no recent
  opening. So screen 04 draws the dashed line from the Places response rather
  than from the rating series: a branch with no recorded opening gets no line
  and says so, and where a line does appear the screen reports what the rating
  did that week without asserting the opening caused it. Detected change points
  are drawn separately, as points on the series. Correlation stays visible;
  causation stays unclaimed.

- **2026-07-30 · Gemini is called over the AI Studio REST endpoint, not Vertex
  AI Agent Engine.** The stack table names Agent Engine and Vertex AI Search.
  Neither can be reached: both require an active billing account, and the
  project's is a closed trial (see the deploy note below). Until that changes
  the table describes an intention, and a submission that shows Agent Engine in
  its architecture diagram while calling nothing is claiming a stack it does
  not run.

  Gemini through Google AI Studio needs only an API key and has a free tier, so
  the reasoning layer can be genuinely wired today. `generativelanguage.googleapis.com`
  is called with `fetch` — no SDK, no new dependency. Two call sites, chosen
  because they are where a language model actually earns its place: the reply
  draft (US-3) and the cited answer (US-4). Everything else — clustering,
  trends, scoring, distance — stays deterministic, because those are
  arithmetic and a model would only make them less verifiable.

  Three constraints hold regardless of who generates the words. The model is
  given only the retrieved passages and must answer from them; its output goes
  through the same guardrail and the same 0.70 threshold as before, and an
  answer whose claims lose their citations is refused, not published
  (constitution I). The call is a numbered step in the execution trace with its
  own latency and cost (III). Budget still degrades to Flash and then refuses
  (V).

  The key is read from `GEMINI_API_KEY` in the API process only. It is never
  bundled into the console: a browser-side key is a public key, and the demo on
  GitHub Pages has no API behind it, so it keeps running the seeded path. With
  no key configured every call site falls back to the deterministic
  implementation rather than failing — the same rule the Business Profile
  adapter already follows.

  **Superseded 2026-08-07: the endpoint is now Vertex AI. See below.**

- **2026-08-07 · Gemini moves from AI Studio to Vertex AI on project
  `ebco-aihack-ardian`.** The premise of the note above no longer holds: that
  project has an active billing account, so `aiplatform.googleapis.com` — the
  endpoint this plan's stack table always named — can be called for real. The
  stack table stops describing an intention for the model layer.

  What changed is the identity, not the transport. It is still one `fetch`
  against a documented HTTP API with no SDK and no new dependency. The
  difference is that Vertex authenticates with an OAuth access token minted
  from Application Default Credentials instead of a bearer API key, so:

  - there is no long-lived model secret to store, mount, rotate, or leak, and
    `GEMINI_API_KEY` is gone from the repository entirely;
  - on Cloud Run the API calls Gemini as its own service account, which
    `infra/iam.tf` already grants `roles/aiplatform.user` — the grant existed
    before anything used it;
  - locally the developer runs `gcloud auth application-default login`, and CI
    can pass `GOOGLE_ACCESS_TOKEN` or a service account key file.

  Credential resolution lives in `api/src/lib/googleAccessToken.js`, not in
  `packages/core`: it needs `node:fs` and `node:crypto`, and core is bundled
  into the browser console. A credential path reachable from browser code is a
  credential path that will eventually be reached from browser code. The
  adapter in core takes an injected `getAccessToken` and stays transport-only.

  Two things this deliberately does **not** do. Vertex AI is opt-in behind
  `LOKUS_REASONING=vertex`, because `GOOGLE_CLOUD_PROJECT` is set on every run
  and gating on it alone would start billing a demo silently; unset, every call
  site falls back to the deterministic implementation exactly as before. And it
  claims nothing about the rest of the Vertex surface — Agent Engine, Vertex AI
  Search and BigQuery are still not adopted, and the rows above still say so.
  Active billing makes them possible, not done.

  Measured on 2026-08-07 against `ebco-aihack-ardian`: `global` and
  `asia-southeast1` both answer 200; `asia-southeast2`, where the rest of the
  stack lives, answers 400 `FAILED_PRECONDITION` — these models are not served
  from Jakarta. `GOOGLE_CLOUD_LOCATION` therefore defaults to `global` and is
  separate from `var.region`, which the Terraform validation still pins. One
  live cited answer through the API wiring: `gemini-3.5-flash`, 6311 ms,
  Rp 6,82, 282 input / 95 visible / 900 thought tokens — recorded in the
  execution trace as a numbered step, per constitution III.

- **2026-08-07 · agent runs are kept in Agent Engine Sessions; the supervisor
  still runs here.** The stack table names Vertex AI Agent Engine as the agent
  runtime. That row is still not true, and this entry does not make it true —
  what it does is connect the part of Agent Engine that can be connected
  honestly today.

  `reasoningEngines` is reachable in `asia-southeast2`, unlike the Gemini
  models, so the traces stay in the region the constitution pins the tenant's
  data to. An engine created without a `spec` runs nothing and builds nothing;
  its `sessions` and `memories` sub-resources are usable on their own. The
  mapping is one session per run, one event per numbered step:

  ```
  run        → Session, displayName = run id, userId = tenant id
  run header → sessionState (question, intent, agents, outcome)
  step       → SessionEvent, appended as it happens, rawEvent = the step
  ```

  This is what constitution III was missing. The trace used to live in a `Map`
  that died with the process — faithful to the interface, but a run nobody can
  fetch tomorrow only exists during the demo. Measured after the change: kill
  the API, start it again with an empty memory, ask for a run id from before
  the restart, and its eight steps come back.

  `userId` carries the tenant because `sessions.list` filters on `user_id`
  server-side, so a cross-tenant read is refused by Google before it is refused
  by us — and refused by us as well, on the way out. A run belonging to another
  tenant answers 404, not 403.

  Two constraints the API imposed, both kept rather than worked around. Session
  state cannot be PATCHed: *"you can only update it by appending an event"*, so
  the outcome is a final event carrying a `stateDelta` — the record is appended
  to, never edited, which is the rule the constitution already imposed on us.
  And run ids came from a per-process counter, which was harmless while runs
  died with the process; against a store that outlives it, today's `run-1`
  would collide with yesterday's, so the API now mints a UUID.

  Failure is a degradation, not an outage. Every write also lands in memory and
  every read falls back to it, with a `agent_engine_degraded` warning on the
  log line — a trace store that is down must not take the answer down with it,
  and must not lose the trace in silence either.

  Not in Terraform: the Google provider 6.12 that `infra/` validates against
  has no `reasoningEngine` resource. `scripts/agent-engine.mjs` creates, lists
  and deletes it instead, and says so where a reader will look.

- **2026-08-07 · the reasoning path is a choice, and screen 14 makes it —
  without ever touching a credential.** Vertex AI replaced the AI Studio key
  earlier today, and replacing it outright was one option too few. The two fail
  differently: an expired identity and a revoked key are different outages, and
  an operator who can move between them is not blocked by either. AI Studio also
  needs no billing account, which makes it the cheapest way for anyone to run
  this repo for real.

  So there are three paths — `deterministic`, `vertex`, `apikey` — and one
  switch object the whole domain shares, so a change takes effect on the next
  question rather than the next deploy.

  The control on screen 14 selects among paths; it does not accept a key. A
  field that took one would send a credential from a browser across the network
  and store it somewhere, which is the single thing this repo's credential
  design exists to prevent. The key and the token provider are resolved in the
  API process from its own environment. What the browser receives is which
  paths are configured and, for the ones that are not, the variable that is
  missing — never the key, never a prefix of it, and not the project id either.
  A test asserts all three stay out of the payload; it caught the project id
  leaking through the panel's own detail line while this was being written.

  Two refusals rather than conveniences. A path that is not configured cannot
  be selected — refused with its reason, because a control that reports success
  while nothing changed teaches an operator to distrust the screen. And the
  switch is read-only unless `LOKUS_REASONING_SWITCHABLE=true`: the choice is
  process-wide, so one tenant's admin must not be able to change how another
  tenant's answers are produced. Making it per-tenant means threading a tenant
  through every `generate` call, which is a larger change than this control
  earns; the limitation is stated in the panel rather than hidden.

  A start-up path that cannot be dialled falls back instead of failing to boot.
  An API that refuses to start because a key expired turns a degraded reasoning
  layer into an outage.

  One bug this surfaced and fixed: `/healthz` and the screen 14 panel both read
  their values once, at registration. After a switch they reported the boot
  value forever. Both now read per request.

- **2026-08-07 · the supervisor is packaged for Agent Engine and blocked on one
  IAM grant.** Agent Runtime's BYOC contract turns out to be two paths and a
  JSON envelope — `POST /api/reasoning_engine` and
  `POST /api/stream_reasoning_engine`, both `{class_method, input} → {output}`,
  on `$PORT`. `api/src/agentRuntime.js` serves them over the same
  `createServices` the HTTP API wires, so the supervisor that would run in
  Agent Engine is the supervisor that runs here, not a second copy that drifts.

  Everything up to the deployment works and is verified:

  - the image builds and is in Artifact Registry
    (`asia-southeast2-docker.pkg.dev/ebco-aihack-ardian/lokus-dev/lokus-agent:v2`);
  - the contract is exercised by tests and by the container itself — deployed
    to Cloud Run as a control, the same image answered
    `intent: diagnosis_cabang, steps: 8, sources: 45`, which rules the
    container out as the cause of what follows.

  `reasoningEngines.create` with that image fails with `INTERNAL` and a generic
  troubleshooting link, and leaves no container logs in the project at all. The
  outstanding difference between the working Cloud Run deployment and the
  failing one is who pulls the image: Agent Engine pulls as its own service
  agent, `service-{number}@gcp-sa-aiplatform-re.iam.gserviceaccount.com`, which
  has no grant on the repository. The grant cannot be made from this account —
  `roles/editor` excludes `setIamPolicy`, at both repository and project level:

  ```
  gcloud artifacts repositories add-iam-policy-binding lokus-dev \
    --location=asia-southeast2 --project=ebco-aihack-ardian \
    --member="serviceAccount:service-849077080663@gcp-sa-aiplatform-re.iam.gserviceaccount.com" \
    --role=roles/artifactregistry.reader
  ```

  This is stated as the leading hypothesis, not a proven cause: Google's
  troubleshooting page does not cover custom containers, and an opaque
  `INTERNAL` with no logs cannot be attributed with certainty. It is the one
  difference that remains after the container was independently proven to run.

  So the "managed agent runtime" row on screen 14 stays `planned`, and the
  supervisor keeps running in the API process. Packaged, buildable, tested, one
  grant away — and not claimed as running, because it is not.

- **2026-07-30 · Cloud Run is not deployed; the demo runs on GitHub Pages.**
  The Google Cloud project's billing account is an expired trial and the card
  offered to reactivate it was declined by Google Payments, so no billable
  resource — Cloud Run, Firestore, BigQuery, Artifact Registry — can be created
  at all. `infra/` is validated against the real Google provider 6.12 and has
  never been applied.

  The console is a static SPA over the seeded dataset, so it was published to
  GitHub Pages instead, where all fourteen screens work with no API and no
  credentials. What that demo does not exercise is the API layer: auth, tenant
  isolation and RBAC are covered by tests and by two local commands, not by the
  public URL. README and `docs/deploy.md` say so in those words.

  Partly overtaken on 2026-08-07: `ebco-aihack-ardian` has an active billing
  account, so billable resources are now possible. The model layer has moved
  there (see the 2026-08-07 entry above). Cloud Run itself is still not
  deployed, and this entry stays true of the deployment until it is.

- **2026-07-30 · a dev token may omit the tenant, and screen 01 depends on it.**
  T058 defined the local token as `dev:<userId>:<tenantId>:<role>`, and the
  console mints one only once a tenant has been chosen. But the tenant list
  comes from `GET /v1/session`, which requires authentication — so against a
  real API the sign-in screen asks for a token that cannot exist until the
  screen it blocks has been used. The console could never get past screen 01
  over HTTP, which meant the auth, tenant-isolation and RBAC layers T059 exists
  to exercise were still only reachable from tests. README told readers to run
  it that way; a judge following those instructions met an empty screen with an
  error state.

  `dev:<userId>` is now also valid. It authenticates a user and carries the
  memberships Identity Platform would carry for the demo account — the three
  seeded tenants with the roles the directory already documents (Nusa Retail
  manager, Klinik Sehat Prima viewer, Dealer Arta Motor admin). That is the
  point of the mode: it stands in for the identity provider, so it should carry
  what the provider would.

  Nothing about tenant scoping moves. `withTenant` still requires the
  `x-lokus-tenant` header and still checks membership against the principal, so
  a tenant outside the demo directory is refused exactly as before, and the
  refusal is still indistinguishable from a tenant that does not exist. The
  mode remains fenced the same three ways: it refuses to boot under
  `NODE_ENV=production`, nothing selects it unless `LOKUS_AUTH_MODE` is exactly
  `dev`, and every request under it is logged as unverified.

- **2026-07-30 · no tenant chosen is a state, not a failure.**
  Opening any screen directly without having picked a tenant rendered that
  screen's error panel — "Permintaan ini tidak menyebutkan tenant" — which is
  accurate and useless. Not having chosen yet is the normal condition of
  someone arriving, and the product already knows where they should go: the
  rail says "Pilih tenant di layar 01" while the panel next to it reports a
  fault.

  The console now sends them to screen 01 and remembers where they were
  heading, in the URL as `/masuk?next=<path>`, so the destination survives a
  reload and is visible rather than hidden in storage. After a tenant is
  chosen it continues there instead of always landing on the briefing.

  `next` is resolved against the fourteen known screen paths and ignored
  otherwise. A redirect target taken from a URL is an open redirect unless it
  is checked against an allowlist, and `findScreenByPath` already is one.

  This matters beyond the local console: anyone opening a deep link into the
  public demo — a link pasted from README, a bookmark, a judge returning to a
  screen — arrived at an error panel instead of being asked which tenant to
  open.

## Definition of done (per phase)

1. All tasks in the phase committed with their task-id prefixes.
2. Eval suite passes its thresholds in CI.
3. Screens in the phase implement all four data states.
4. No hard-coded design values; everything from `design/tokens.css`.
5. README updated if the phase changes what a judge would see.
