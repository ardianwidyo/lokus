# Implementation Plan: LOKUS Core

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite | single stylesheet: `design/tokens.css` |
| Domain | `packages/core` — plain JS, no cloud SDK | theme clustering, guardrails, draft assembly, scoring, seeded dataset |
| API | Cloud Run (Node 20 + Fastify) | Identity Platform auth, RBAC middleware |
| Agents | Vertex AI Agent Engine (ADK) | supervisor + 3 specialised agents |
| Models | Gemini (reasoning), Gemini Flash (bulk summarisation) | tier switch on budget |
| Retrieval | Vertex AI Search, `text-embedding-004` | chunk 800 tokens, overlap 120 |
| Analytics | BigQuery (+ GIS) | review facts, theme rollups, distance/catchment |
| State | Firestore | tenants, tickets, agent runs/traces |
| Docs | Cloud Storage | source SOP/catalog files |
| External | Business Profile Performance API, Places API (New) | adapters behind one interface each |
| Scheduling | Cloud Scheduler → Pub/Sub | nightly cycle 23:00, briefing by 06:00 |
| Ops | Terraform, GitHub Actions, Cloud Logging + Trace, Secret Manager | region `asia-southeast2` |

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

## Definition of done (per phase)

1. All tasks in the phase committed with their task-id prefixes.
2. Eval suite passes its thresholds in CI.
3. Screens in the phase implement all four data states.
4. No hard-coded design values; everything from `design/tokens.css`.
5. README updated if the phase changes what a judge would see.
