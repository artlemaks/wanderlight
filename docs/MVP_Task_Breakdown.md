# Wanderlight — MVP Task Breakdown

> Per-phase, per-workstream task breakdown for the Wanderlight MVP.
> Derived from `Wanderlight_MVP_Scope.docx` (v1.0). Produced via `/v-team` (3-critic panel, 26 findings applied).
> Companion planning artifact: `~/vault/wanderlight/plans/2026-07-01-1930-mvp-task-breakdown.md`.

---

## §0 · How to use this document

### Task model
Work is organized **Phase → Epic → Task**. Phases (P0–P6) come straight from scope §13. Each phase holds
a handful of **epics** (a coherent slice of work); each epic holds **tasks** (a 0.5–3 ideal-day unit with
its own acceptance criteria).

### Task ID scheme
`P{phase}-{STREAM}-{nn}` — e.g. `P1-SRV-03`. Stable once assigned; reference them in commits/issues/PRs.
The `nn` is unique **within a phase+stream**, not a reading order — a lower number does not imply an
earlier epic (e.g. `P0-CLI-01/02` are movement, `P0-CLI-03/04` are the chunk system that precedes them).
Sequencing is defined by the **Deps** column and the §4 critical path, not by ID.

| Stream | Code | Covers |
|--------|------|--------|
| Infra / DevOps | `INFRA` | Repo, tooling, CI/CD, envs & secrets, hosting, observability (logs, error-tracking, monitoring), backup/restore |
| Data | `DATA` | Schema, migrations, indexing, seed/fixtures |
| Server / API | `SRV` | Fastify endpoints, jobs, economy, auth, payments |
| Client | `CLI` | PixiJS render, input, UI screens, cosmetics rendering |
| Content | `CNT` | Art, audio, signpost templates/word-banks, cosmetics, authored world seeds |
| Analytics | `ANL` | PostHog events, funnels, dashboards |
| Test / QA | `TST` | Unit, integration, e2e, load, perf, manual QA |
| Live-ops / Admin | `OPS` | Admin/moderation tooling, season ops, beta ops, runbooks |
| Governance / Review | `GOV` | Human review gates, scope-audits, go/no-go decisions |

### Task fields
Every task table has: **ID · Title · Description · Acceptance Criteria (AC) · Deps · Est**.
`Est` is in **ideal-days (d)** — focused build time, not calendar time. Ranges roll up to the scope's
per-phase week estimates; they are **not** committed calendar dates.

### Status legend (fill in as you go)
`☐ todo` · `▶ in-progress` · `✅ done` · `⏸ blocked` · `⤴ deferred (post-MVP)`

### Conventions
- **Definition of Done (task):** AC met · code reviewed (human) · relevant tests green · analytics events (if any) firing · no new lint/type errors.
- **Monetization guardrail rule (binding):** *every* task under a monetization epic MUST carry an AC that references scope §9 guardrails — **motes (earned) and embers (bought) are separate currencies**, **nothing purchasable grants power or degrades another player's world**, and **every cosmetic is reachable through free play**. Tasks that can't satisfy this are out of scope.
- **Scope discipline:** anything not in scope §6 In-Scope is deferred to the post-MVP backlog (§5.G). The per-phase `GOV` scope-audit enforces this.
- **Update cadence:** refresh task statuses at each phase-exit review; re-baseline estimates only when scope changes.

---

## §1 · Foundations & locked decisions

Locked from scope §8 — changing any of these is an ADR-level decision.

| Layer | Choice | Notes |
|-------|--------|-------|
| Client | TypeScript + **PixiJS** (WebGL 2D) via **Vite** | Tiles, parallax, lighting, particles |
| API | **Node.js + Fastify** (REST/JSON) | Stateless request/response; no sockets at MVP |
| Database | **PostgreSQL** (Neon or Supabase) | Relational + JSONB; chunk-indexed spatial queries |
| Cache | **Redis** (optional, defer until DB latency demands) | Hot-chunk trace lists + warmth |
| Auth | Anonymous **device token → optional email** (Lucia / Supabase Auth) | Zero-friction start; cross-device upgrade |
| Static/CDN | **Cloudflare Pages / R2** | Client + assets |
| Hosting | **Fly.io or Railway** (API) + managed Postgres | Low fixed cost, horizontal scale |
| Analytics | **PostHog** | Product analytics + funnels + feature flags |
| Error tracking | **Sentry** (or PostHog error tracking) | Chosen in P0 |

**Core spatial model (locked in P0-CLI-03):** one persistent shared world → grid of **chunks** (target
64×64 tiles). Deterministic terrain from a **fixed, versioned seed**; hand-authored landmarks placed
deterministically. Per-chunk **warmth** value (raised by traces, lights, footfall) drives visual state.

**Repo layout (proposed monorepo):**
```
/client        PixiJS + Vite app
/server        Fastify API
/shared        shared TS types (chunk coords, trace payloads, API contracts)
/content       word-banks, signpost templates, seed-trace corpus, art/audio source
/docs          this document + ADRs
/infra         IaC / deploy config
```

---

## §2 · Cross-cutting workstreams

These are **not** phases — they thread through every phase. The phase sections below group tasks under
these streams. Two are easy to under-fund and are called out explicitly:

- **ANALYTICS** starts in **P0** (event schema) and is instrumented incrementally so success metrics
  (scope §12) can be measured *before* it's too late to react. See the instrumentation map (§5.D).
- **CONTENT (art/audio)** is the **critical-path long-pole** (scope §13). It starts in **P0** (direction
  spec + placeholders) and runs in **parallel** with code, not serially after it. See §4 critical path.

---

## §3 · Phases

> Each phase: **Goal & demo** · **Entry preconditions** · **Epics + task tables** · **Exit criteria + demo script** · **Phase risks**.

---

### P0 — Prototype + Foundations  ·  *≈1–2 weeks*

**Goal & demo:** One traveler glides across a deterministic, seeded terrain in the browser, camera
following, over placeholder art. Repo, CI, error-tracking, and analytics scaffolding all live.

**Entry preconditions:** Scope approved; this document approved.

#### Epic P0.A — Repo & tooling bootstrap (INFRA)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P0-INFRA-01 | Monorepo scaffold | Init monorepo (`client`/`server`/`shared`/`content`/`docs`/`infra`), package manager, workspaces | `npm run` builds all workspaces; `shared` importable from client & server | — | 1d |
| P0-INFRA-02 | Client toolchain | Vite + TS + PixiJS app boots to a blank canvas | `npm run dev` serves a PixiJS stage at 60fps on a laptop | P0-INFRA-01 | 0.5d |
| P0-INFRA-03 | Lint/format/type gates | ESLint + Prettier + strict `tsconfig` across workspaces | CI fails on lint/type error; pre-commit hook runs format | P0-INFRA-01 | 0.5d |
| P0-INFRA-04 | CI skeleton | GitHub Actions: install → typecheck → lint → test → build on PR | Green pipeline on a trivial PR | P0-INFRA-03 | 1d |
| P0-INFRA-05 | Env & secrets scaffold | `.env.example`, config loader, secret handling policy (no secrets in repo) | App reads config from env; docs list required vars | P0-INFRA-01 | 0.5d |
| P0-INFRA-06 | Error tracking + logging | Choose + wire Sentry (or PostHog errors); structured server logging | Thrown error appears in dashboard; logs are JSON with request id | P0-INFRA-05 | 1d |

#### Epic P0.B — Chunk & coordinate system (CLI/DATA) — *foundational, blocks P1*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P0-CLI-03 | Chunk coordinate system design | Define tile size, chunk size (64×64), world→chunk→tile transforms, client-side chunk-ID calc; document in `/shared` + ADR | Pure functions in `shared` with unit tests: `worldToChunk`, `chunkToWorld`, `visibleChunkIds(camera)` | P0-INFRA-01 | 1.5d |
| P0-CLI-04 | Chunk grid + culling | Render only visible chunks; load/unload as camera moves | Off-screen chunks are not drawn; no leak over 5-min pan | P0-CLI-03 | 1d |

#### Epic P0.C — Deterministic world (CLI/DATA) — *foundational, blocks multiplayer*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P0-CLI-05 | Seeded terrain generation | Softly-procedural terrain from a fixed seed; deterministic per chunk | Same seed → identical terrain every run | P0-CLI-03 | 2d |
| P0-CLI-06 | Cross-engine determinism validation | Prove terrain identical across Chrome/Firefox/Safari; lock a **seed version** constant | Automated hash of a sample region matches across browsers; seed version recorded in `shared` | P0-CLI-05 | 1d |
| P0-CNT-01 | Deterministic landmark placement | Place hand-authored landmarks (shrine, high points, water) at deterministic coords | Landmarks appear at identical positions for all clients | P0-CLI-05 | 0.5d |

#### Epic P0.D — Traveler movement & camera (CLI)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P0-CLI-01 | Input + movement | WASD / arrows / click-to-move with a light "glide" feel; local only | Traveler moves smoothly; input latency imperceptible | P0-INFRA-02 | 1.5d |
| P0-CLI-02 | Follow camera | Camera tracks traveler with soft lerp; respects world bounds | Traveler stays centered; no jitter at bounds | P0-CLI-01 | 0.5d |
| P0-CNT-02 | Placeholder art set | Minimal tiles + traveler sprite (grey-box quality) | Distinct terrain types + traveler are visually legible | — | 0.5d |

#### Epic P0.E — Analytics foundation (ANL) — *start early per gd-5*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P0-ANL-01 | PostHog init | Wire PostHog client + server; anonymous distinct-id tied to (future) device token | `session_start` fires and appears in PostHog | P0-INFRA-05 | 0.5d |
| P0-ANL-02 | Core event schema | Define the canonical event taxonomy (`session_start`, `place_trace`, `discover_trace`, `appreciate_trace`, `receive_appreciation`, `return_post_appreciation`, `purchase`) + property contract in `shared` | Event names/props documented in §5.D and typed in `shared` | P0-ANL-01 | 1d |

#### Epic P0.F — Content & governance kickoff (CNT/GOV)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P0-CNT-03 | Art direction spec | Painterly low-detail 2.5D direction bible: palette, warmth states, mood refs, content-budget targets (scope §7) | Written spec approved by art director (Artur); referenced by all CNT tasks | — | 1d |
| P0-CNT-04 | Audio direction brief | Adaptive ambient score brief + diegetic SFX list | Brief approved; SFX inventory drafted | — | 0.5d |
| P0-GOV-01 | Review-gate + scope-audit process | Define human review gate (code = static analysis + tests + human functional/visual check; art = director sign-off vs budget) and the per-phase scope-audit checklist | Process doc in `/docs`; applied from P1 onward | — | 0.5d |
| P0-TST-01 | Test harness | Unit test runner (Vitest) + first determinism/coord tests wired into CI | `npm test` green in CI with coord + determinism tests | P0-INFRA-04 | 0.5d |

**Exit criteria:** deterministic terrain validated cross-browser; movement+camera smooth; CI/error-tracking/PostHog live; art & audio direction approved; coord system locked.
**Demo script:** open the tab → traveler glides over a seeded valley with visible landmarks → confirm a second browser renders the identical world → show `session_start` in PostHog.
**Phase risks:** determinism drift across JS engines (mitigated by P0-CLI-06); art direction thrash (mitigated by locking P0-CNT-03 early).

---

### P1 — Traces vertical slice  ·  *≈2–3 weeks*

**Goal & demo:** A player places and reads a **signpost** and a **lantern**, persisted server-side and
visible to others; another player leaves an **appreciation** that rewards the author. First full
loop across the DB.

**Entry preconditions:** P0 exit met (coord system + determinism locked).

#### Epic P1.A — Data schema & migrations (DATA)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P1-DATA-01 | Migration tooling | Pick + wire migration tool; migrate-on-deploy policy | `migrate up/down` works locally + CI; policy documented | P0-INFRA-05 | 0.5d |
| P1-DATA-02 | `player` table | `id, device_token, email?, created_at, motes, cosmetics_owned(jsonb), pass_tier` | Migration applies; anon player row creatable | P1-DATA-01 | 0.5d |
| P1-DATA-03 | `trace` table + indexes | `id, type, chunk_x, chunk_y, x, y, author_id, payload(jsonb), warmth, appreciations, created_at, expires_at`; index `(chunk_x, chunk_y)` | Insert + chunk-range select verified; EXPLAIN uses the index | P1-DATA-01 | 1d |
| P1-DATA-04 | `chunk_state` table | `chunk_x, chunk_y, warmth, footfall(jsonb), trace_count, updated_at` (denormalized aggregates) | Row upserts on trace insert | P1-DATA-03 | 0.5d |
| P1-DATA-05 | `appreciation` table | `id, trace_id, from_id, created_at`, `UNIQUE(trace_id, from_id)` | Duplicate appreciation rejected by constraint | P1-DATA-03 | 0.5d |

#### Epic P1.B — API scaffold & spatial reads (SRV)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P1-SRV-01 | Fastify scaffold | App skeleton, health check, error handler, request-id, PostHog server hook | `/health` 200; errors reach Sentry with request-id | P0-INFRA-06 | 0.5d |
| P1-SRV-02 | Anonymous session bootstrap | Issue device token on first contact; attach player row | New visitor gets a stable token + player row | P1-DATA-02 | 1d |
| P1-SRV-03 | Chunk query strategy design | Design the read algorithm: max traces per chunk (density cap), prioritization by **freshness + appreciation + light**, tie-breaks, index plan; document | Written strategy + AC-backed query returning capped, prioritized rows | P1-DATA-03 | 1.5d |
| P1-SRV-04 | `GET /world/chunks?ids=` | Return capped, prioritized trace lists + warmth for requested chunks | Returns correct traces within cap; p95 < 150ms at seed data | P1-SRV-03 | 1.5d |

#### Epic P1.C — Trace writes + gating (SRV)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P1-SRV-05 | `POST /trace` (signpost, lantern) | Validated insert; server computes chunk from x,y; sets `expires_at` | Signpost/lantern persist; invalid payloads rejected | P1-SRV-04 | 1.5d |
| P1-SRV-06 | Economy + rate-limit gates | Trace placement costs motes; per-account + per-chunk rate limits | Over-limit/insufficient-motes requests rejected with clear errors | P1-SRV-05 | 1d |
| P1-SRV-07 | `POST /trace/:id/appreciate` | Record appreciation (idempotent per player); reward author motes | Second appreciation by same player is a no-op; author motes increment | P1-DATA-05 | 1d |

#### Epic P1.D — Client trace loop (CLI)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P1-CLI-01 | Chunk fetch on movement | Request traces for chunks entering view; cache + evict | Traces appear as you approach; no duplicate fetches | P1-SRV-04, P0-CLI-04 | 1.5d |
| P1-CLI-02 | Render signpost + lantern | Draw trace sprites at world coords; interact-on-approach affordance | Traces render at correct positions; hover/near shows prompt | P1-CLI-01 | 1d |
| P1-CLI-03 | Trace-placement radial | Radial: pick type → composer/confirm → POST | Placing a trace persists and appears after refresh | P1-SRV-05 | 1.5d |
| P1-CLI-04 | Curated signpost composer | Template picker + word-bank slot filling; no free text | Only valid template+slot combos submittable; preview shown | P1-CNT-01 | 2d |
| P1-CLI-05 | Read + appreciate UI | Read a signpost; "thanks" action → appreciate endpoint | Appreciation reflects (author notified later in P3); button disables after use | P1-SRV-07 | 1d |

#### Epic P1.E — Signpost content (CNT) — *expanded per gd-3*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P1-CNT-01 | Signpost templates | Author **40 templates** (≈5 categories × 8: encourage / warn / discover / gift / mystery) with slot markers | 40 on-theme templates reviewed + approved; stored in `/content` | P0-CNT-03 | 2d |
| P1-CNT-02 | Word banks | Curate word banks per slot (adjectives, places, actions, emotions; ~20–40 words each) | Every template's slots have an approved bank; no offensive terms | P1-CNT-01 | 3d |

#### Epic P1.F — Analytics, tests, governance
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P1-ANL-01 | Activation funnel instrumentation | Fire `place_trace` + `discover_trace`; build "session-1 places a trace" funnel | Funnel visible in PostHog; activation % computable | P0-ANL-02, P1-CLI-03 | 1d |
| P1-TST-01 | API integration tests | Cover chunk read, trace write, gating, appreciation idempotency | Tests green in CI; cover happy + rejection paths | P1-SRV-07 | 1.5d |
| P1-TST-02 | First e2e loop test | Playwright: place signpost → other session discovers → appreciates | e2e green headless in CI | P1-CLI-05 | 1.5d |
| P1-GOV-01 | P1 review gate + scope audit | Human review of the slice; confirm nothing beyond scope §6 crept in | Sign-off recorded; out-of-scope items logged to §5.G | P0-GOV-01 | 0.5d |

**Exit criteria:** full place→discover→appreciate loop persists across two clients; gating + rate limits enforced; activation funnel live.
**Demo script:** player A composes a signpost + lights a lantern → player B (different device) discovers them, reads, taps thanks → player A's mote balance rises → funnel shows activation.
**Phase risks:** chunk query hot-spots (mitigated by P1-SRV-03 + index); composer UX friction (validate with a quick usability check).

---

### P2 — Full trace set + economy + background jobs  ·  *≈2–3 weeks*

**Goal & demo:** All five trace types live; motes economy + journal; the world **self-curates**
(density cap + fade/GC) and **remembers** (warmth + emergent footpaths). System-authored seed traces
begin populating the world (cold-start mechanism).

**Entry preconditions:** P1 loop stable.

#### Epic P2.A — Remaining trace types (SRV/CLI/DATA)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P2-SRV-01 | Gift trace | `POST` gift (spends a gift charge); claim endpoint sends silent thanks | Finder can claim once; author rewarded; charge consumed | P1-SRV-05 | 1.5d |
| P2-SRV-02 | Shrine offering | Offering endpoint contributes to a shared, growing shrine structure at a landmark | Offerings accumulate; shrine state readable | P1-SRV-05 | 1.5d |
| P2-DATA-01 | Lantern lit-count | Extend lantern payload: `lit_count`; lighting raises chunk warmth | Lighting increments count + warmth; idempotent per player | P1-DATA-03 | 0.5d |
| P2-CLI-01 | Gift/shrine/lantern UI | Client flows: wrap+place gift, claim, make offering, light lantern | All four interactions work + animate | P2-SRV-01, P2-SRV-02 | 2d |

#### Epic P2.B — Footpaths & warmth (SRV/CLI) — *jobs detailed per tech-4/tech-10*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P2-CLI-02 | Movement heat sampling | Sample traveler position at low resolution; batch-send to server | Sampling adds no perceptible client cost; batched sends | P0-CLI-01 | 1d |
| P2-SRV-03 | Footpath aggregation job | Background job: aggregate heat → per-tile counter (batch frequency, tile resolution, write strategy, cache invalidation, perf budget) | Job runs on schedule within perf budget; heat persists | P2-CLI-02 | 2d |
| P2-CLI-03 | Footpath rendering | Render worn paths from heat; blends with terrain | Popular routes visibly wear; no manual placement | P2-SRV-03 | 1d |
| P2-SRV-04 | Warmth model | Compute per-chunk warmth from traces + lights + footfall; expose in chunk read | Warmth updates on relevant writes; returned by `GET /world/chunks` | P2-DATA-01 | 1d |
| P2-CLI-04 | Warmth visual state (basic) | Client renders warmth as tint/lushness tiers (approach chosen: sprite overlay vs shader — prototyped here, polished P5) | Warmer chunks visibly lusher/glowing; approach documented for P5 | P2-SRV-04 | 1.5d |

#### Epic P2.C — Economy & journal (SRV/DATA/CLI)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P2-SRV-05 | Motes economy rules | Earn (explore, collect motes, first-light, receive appreciation) + spend (place traces, free-tier cosmetics) | Balances change per documented rules; server-authoritative | P1-SRV-06 | 1.5d |
| P2-CLI-05 | Mote collection ("motes of light") | Collectible motes in world; HUD balance + gift charges | Collecting increments balance; HUD accurate | P2-SRV-05 | 1d |
| P2-DATA-02 | `journal_event` table | `id, player_id, kind, ref_id, created_at` personal history feed | Events recorded for visits/traces/appreciations/offerings | P1-DATA-01 | 0.5d |
| P2-CLI-06 | Traveler journal UI | Private log: places visited, traces left, appreciations received, shrines contributed | Journal reflects real events; loads fast | P2-DATA-02 | 1.5d |

#### Epic P2.D — Self-curation: density cap + fade/GC (SRV) — *detailed per tech-5/gd-6*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P2-SRV-06 | Density cap + prioritization | Enforce per-chunk visible-trace cap using freshness/appreciation/warmth priority (reuses P1-SRV-03 strategy) | Over-cap chunks return only top-priority traces | P1-SRV-03 | 1d |
| P2-SRV-07 | Fade + GC job | Cron job: fade + garbage-collect old, unappreciated, expired traces; safe deletion; perf logging | GC removes eligible traces; never removes fresh/appreciated ones; logged | P2-SRV-06 | 1.5d |

#### Epic P2.E — Cold-start seeding mechanism (SRV/CNT) — *moved earlier per gd-1 (BLOCKER)*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P2-SRV-08 | System-trace author | Mechanism to place **system-authored** traces (flagged, non-GC'd or slow-GC) to seed density | System traces placeable via admin/script; visually indistinguishable to players | P2-SRV-01 | 1d |
| P2-CNT-01 | Initial seed pass (partial) | First batch of authored system signposts/lanterns/gifts across The First Vale | Every visited chunk shows ≥1 seed trace in playtest | P2-SRV-08, P1-CNT-01 | 1d |

#### Epic P2.F — Analytics, tests, governance
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P2-ANL-01 | Retention-signal instrumentation | Fire appreciation + journal events; track "% of traces receiving ≥1 appreciation" | Metrics computable in PostHog | P0-ANL-02 | 1d |
| P2-TST-01 | Job unit/integration tests | Cover footpath aggregation, fade/GC eligibility, warmth calc | Tests green; GC-safety test proves fresh/appreciated survive | P2-SRV-07 | 1.5d |
| P2-TST-02 | Density/perf test | Chunk load **< 500ms at max density**; GC causes no lag spikes | Perf thresholds asserted in a repeatable test | P2-SRV-06 | 1.5d |
| P2-CLI-07 | Appreciation-summary UI design | Design (not yet wired) the "N travelers thanked your signpost" summary surface | Design approved; ready to wire in P3 | P2-CLI-06 | 0.5d |
| P2-GOV-01 | P2 review gate + scope audit | Review + scope check | Sign-off; out-of-scope logged | P1-GOV-01 | 0.5d |

**Exit criteria:** all 5 trace types + economy + journal working; world self-curates and shows warmth/footpaths; seed traces populate the world.
**Demo script:** wander a warm, worn valley seeded with traces → leave a gift, make a shrine offering, light a lantern → check journal → show fade/GC keeping a chunk under cap.
**Phase risks:** job performance under density (mitigated P2-TST-02); warmth-render approach uncertainty (prototype now, decide for P5).

---

### P3 — Accounts + cosmetics + appreciation loop  ·  *≈2 weeks*

**Goal & demo:** Anonymous → optional email upgrade with cross-device continuity; wardrobe + attunement
cosmetics; and the **highest-leverage retention feature** — players are notified/summarized when strangers
appreciated their traces.

**Entry preconditions:** P2 economy + journal live.

#### Epic P3.A — Accounts & auth upgrade (SRV/DATA) — *detailed per tech-9*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P3-SRV-01 | Auth provider integration | Wire Lucia/Supabase Auth for email; keep anon device-token path | Anon and email sessions both authenticate | P1-SRV-02 | 1.5d |
| P3-SRV-02 | Anon→email upgrade flow | Token swap that preserves the anon player's data; link account | Upgrading keeps motes/cosmetics/journal; no data loss | P3-SRV-01 | 1.5d |
| P3-SRV-03 | Cross-device linking + edge cases | Sign in on a second device → same account; handle simultaneous login / conflict | Two devices resolve to one consistent account; conflicts handled deterministically | P3-SRV-02 | 1.5d |

#### Epic P3.B — Appreciation notifications & summaries (SRV/CLI/ANL) — *per gd-2*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P3-SRV-04 | Appreciation notification service | Aggregate appreciations per author; in-app feed + optional email digest | Author sees "you were thanked" on return; email opt-in only | P2-ANL-01 | 1.5d |
| P3-CLI-01 | Return + summary UI | Wire the P2-designed summary ("N travelers thanked your signpost") into return flow + journal highlights | Summary shows on return when appreciations occurred | P2-CLI-07, P3-SRV-04 | 1.5d |
| P3-ANL-01 | Return-rate instrumentation | Fire `return_post_appreciation`; measure D1 return after a notification | Metric computable; ties to §12 "return rate after appreciation" | P3-SRV-04 | 1d |

#### Epic P3.C — Cosmetics & progression (SRV/DATA/CLI)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P3-DATA-01 | Cosmetic ownership model | Extend `cosmetics_owned(jsonb)`; catalog of cosmetic ids + categories | Ownership queryable; catalog seeded | P1-DATA-02 | 0.5d |
| P3-SRV-05 | Attunement (light unlock) track | Non-power cosmetic unlocks earned by play (lantern colors, signpost styles, cloak patterns, emote-glyphs) | Unlocks grant on play milestones; no gameplay power | P2-SRV-05 | 1d |
| P3-CLI-02 | Wardrobe screen | Equip owned cosmetics (traveler cloak/glyph/trail, lantern colors, signpost frames, gift wraps) | Equipping updates the rendered traveler/traces | P3-DATA-01 | 1.5d |
| P3-CLI-03 | Cosmetic rendering support | Client renders cosmetic families incl. **≥8 lantern colors, cloak/trail/glyph variants** (handoff for P4 store) | All planned cosmetic families render correctly by phase exit | P3-CLI-02 | 1.5d |

#### Epic P3.D — Seed corpus & cosmetic specs (CNT) — *cold-start + art handoff*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P3-CNT-01 | Authored seed corpus | Hand-place **40–50** curated system traces across landmarks/routes before beta | Corpus placed; density audit shows no barren visited chunks | P2-SRV-08 | 2d |
| P3-CNT-02 | Cosmetic design specs | Approve full cosmetic spec (traveler cloaks/glyphs/trails, lantern recolors, signpost frames, gift wraps) so P5 art can execute | Spec approved vs content budget (§7); handoff to P5 | P0-CNT-03 | 1.5d |

#### Epic P3.E — Tests & governance
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P3-TST-01 | Auth-migration tests | Cover upgrade/link/simultaneous-login; assert no data loss | Tests green incl. conflict cases | P3-SRV-03 | 1.5d |
| P3-TST-02 | Notification tests | Appreciation aggregation + digest correctness | Tests green; no duplicate/missed notifications | P3-SRV-04 | 1d |
| P3-GOV-01 | P3 review gate + scope audit | Review + scope check | Sign-off; out-of-scope logged | P2-GOV-01 | 0.5d |

**Exit criteria:** cross-device accounts with lossless upgrade; wardrobe + attunements; appreciation notifications live and instrumented; seed corpus placed; cosmetic specs approved.
**Demo script:** play anon → upgrade to email → sign in on phone (same account) → equip a cosmetic → receive "3 travelers thanked your signpost" on return.
**Phase risks:** upgrade data-loss (mitigated P3-TST-01); notification spam/tone (aggregate + digest, opt-in email).

---

### P4 — Season + monetization + admin  ·  *≈2–3 weeks*

**Goal & demo:** A launch season with a free + premium Trail Pass; a cosmetic store with the **embers**
premium currency; working payments + reconciliation; rewarded ads; and admin/live-ops + moderation
tooling. **All monetization respects scope §9 guardrails.**

**Entry preconditions:** P3 cosmetics/rendering + accounts live.

#### Epic P4.A — Season & Trail Pass (SRV/DATA/CLI)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P4-DATA-01 | `season` / `pass_progress` | `season_id, player_id, xp, claimed(jsonb)` drives Trail Pass tracks | Schema applies; progress recordable | P1-DATA-01 | 0.5d |
| P4-SRV-01 | Season engine | Configure a ~6–8 wk season ("The Waking Vale"): themed shrine goal, reward tracks | Season runs on a schedule; XP accrues from play | P4-DATA-01 | 1.5d |
| P4-SRV-02 | Trail Pass (free + premium lanes) | Free lane + premium lane of **cosmetics + mote boosts only** | **AC (§9):** premium lane grants no power; all reward types are cosmetic/boost; free lane reachable by play | P4-SRV-01 | 1.5d |
| P4-CLI-01 | Trail Pass UI | Track view, claim rewards, upgrade to premium | Claims work; premium purchase flow reachable | P4-SRV-02 | 1.5d |

#### Epic P4.B — Store, embers & guardrails (SRV/DATA/CLI) — *per gd-4*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P4-DATA-02 | Embers currency | Add **embers** (bought) as a currency **separate from motes** (earned) | **AC (§9):** embers and motes never interchangeable in a way that grants power; schema enforces separation | P3-DATA-01 | 0.5d |
| P4-SRV-03 | Cosmetic store backend | Catalog + purchase (cloaks/glyphs/trails, lantern colors, signpost frames, gift wraps) with embers | **AC (§9):** every store cosmetic is also earnable via free play; nothing sold affects shared world/others | P4-DATA-02 | 1.5d |
| P4-CLI-02 | Store / browse UI | Cosmetic browsing + purchase; price bands $1.99–$6.99 | Purchase grants cosmetic; guardrail copy shown · **AC (§9):** UI sells cosmetics only and states embers≠power + every cosmetic is free-earnable | P4-SRV-03 | 1.5d |
| P4-SRV-04 | Premium QoL bundle | One-time "Wayfarer's Kit": extra journal detail, more gift charges/day, cosmetic-only perks | **AC (§9):** convenience/expression only — no gameplay power or shared-world advantage | P4-SRV-03 | 1d |

#### Epic P4.C — Payments & reconciliation (SRV) — *detailed per tech-6*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P4-SRV-05 | Payment provider integration | Choose provider (Stripe/Paddle), wire SDK, handle currency + tax | Test purchase completes; webhook received; grant applied · **AC (§9):** purchases grant only cosmetics/embers, never power or shared-world advantage | P4-SRV-03 | 2d |
| P4-SRV-06 | Reconciliation job | Daily balance verification (provider vs DB), discrepancy handling, audit log | Job flags discrepancies; audit trail per transaction · **AC (§9):** reconciles bought cosmetics/embers only; never touches earned motes/progression | P4-SRV-05 | 1.5d |
| P4-SRV-07 | Refund / chargeback flow | Handle refunds + chargebacks: revoke grants, adjust balances, record | Refunded purchase revokes cosmetic/currency; logged · **AC (§9):** revocation affects only bought items, never earned motes or another player's world | P4-SRV-05 | 1d |

#### Epic P4.D — Rewarded ads (SRV/CLI)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P4-SRV-08 | Rewarded-ad reward endpoint | Grant small mote top-up / daily gift charge on verified ad completion; daily caps | **AC (§9):** strictly opt-in; never interstitial; capped; grants no power | P2-SRV-05 | 1d |
| P4-CLI-03 | Rewarded-ad UI | Optional "watch for motes" entry point; respects caps | Opt-in only; cap enforced in UI · **AC (§9):** strictly opt-in, never interstitial, daily-capped; reward grants no power | P4-SRV-08 | 1d |

#### Epic P4.E — Admin, moderation & abuse (OPS/SRV) — *per risk-5, §8.4*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P4-DATA-03 | `report` table | `id, trace_id, reporter_id, reason, status` | Reports insertable; status transitions defined | P1-DATA-03 | 0.5d |
| P4-SRV-09 | Report + flag flow | Any trace reportable; feeds admin queue | Reporting a trace creates a queue item | P4-DATA-03 | 1d |
| P4-OPS-01 | Admin dashboard | Review report queue, remove/fade traces, place/remove landmarks, tune caps, run a season | **AC:** admin can triage a 10-item queue in <5 min; all actions audited | P4-SRV-09 | 2d |
| P4-SRV-10 | Bot resistance | Light PoW / hCaptcha on first write; reduced initial mote earn for new anon accounts | First-write challenge present; new-account earn throttled | P1-SRV-06 | 1d |
| P4-CNT-01 | Seed density interim top-up | Continue the P3 seed corpus: add authored system traces around the new season's themed shrine + any thin routes before beta | Season/shrine area + all main routes show healthy seed density pre-beta | P3-CNT-01, P4-SRV-01 | 0.5d |

#### Epic P4.F — Perf targets, analytics, tests, governance
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P4-TST-01 | Performance targets + load scenarios | Define **max traces/chunk, target CCU, FPS budget, DB query-latency SLA**; author load-test scenarios (prereq for P5 perf work) | Targets documented + agreed; k6/Artillery scenarios committed | P2-TST-02 | 1.5d |
| P4-ANL-01 | Monetization instrumentation | Fire `purchase`; build payer-conversion, ARPDAU, Trail Pass attach metrics | Metrics visible in PostHog | P0-ANL-02, P4-SRV-05 | 1d |
| P4-TST-02 | Payment reconciliation test | N test purchases reconcile with zero discrepancy; refund revokes | Test green; reconciliation proven | P4-SRV-06 | 1d |
| P4-TST-03 | Store/season tests | Purchase grants, Trail Pass claims, guardrail assertions (embers≠power) | Tests green incl. guardrail checks | P4-SRV-04 | 1d |
| P4-GOV-01 | P4 review gate + **guardrail compliance audit** | Review; explicitly verify every monetization AC cites §9 and holds | Sign-off; any guardrail violation blocks merge | P3-GOV-01 | 0.5d |

**Exit criteria:** season + Trail Pass live; store + embers + payments + reconciliation working and reconciled; rewarded ads opt-in; admin/moderation usable; perf targets set; monetization guardrails verified.
**Demo script:** buy a cloak with embers → claim a Trail Pass reward → watch an opt-in ad for motes → moderate a reported trace in admin → show a reconciliation run with zero discrepancy.
**Phase risks:** payment provider constraints (de-risk with P4-SRV-05 early); guardrail drift (mitigated by P4-GOV-01).

---

### P5 — Art/audio pass + polish + beta  ·  *≈3–4 weeks (long-pole)*

**Goal & demo:** The real, beautiful, accessible game: production art + adaptive audio, warmth polish,
accessibility, performance against P4 targets, and a closed beta building density before open launch.

**Entry preconditions:** P4 systems complete; cosmetic specs (P3-CNT-02) + perf targets (P4-TST-01) ready.

#### Epic P5.A — Production art (CNT/CLI) — *decomposed per risk-4*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P5-CNT-01 | Tileset + props (wk1) | Real tileset (4–5 terrain types) + ~20 props per content budget (§7) | Approved by director; performs at FPS budget | P0-CNT-03 | 3d |
| P5-CNT-02 | Trace visual families (wk2) | 5 trace visual families × ~4 recolor variants | All trace types render in final art | P5-CNT-01 | 2.5d |
| P5-CNT-03 | Cosmetic set (wk2) | ~25 season cosmetic items per spec (P3-CNT-02) | All store/Trail-Pass cosmetics have final art | P3-CNT-02 | 3d |
| P5-CLI-01 | Art integration | Replace placeholders; recolor by warmth + season | No placeholder art remains; warmth recolor works | P5-CNT-02 | 2d |

#### Epic P5.B — Audio & warmth polish (CNT/CLI) — *per tech-10*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P5-CNT-04 | Adaptive audio (wk3) | Ambient score with layers that swell near warm/populated areas; diegetic chimes for discoveries/appreciations | Audio adapts to warmth; SFX on key events | P0-CNT-04 | 3d |
| P5-CLI-02 | Warmth visual polish | Finalize warmth rendering (shader/glow vs sprite overlay, per P2 prototype); volumetric light, particles | Warm areas are visibly lush/glowing; within FPS budget | P2-CLI-04 | 2d |

#### Epic P5.C — Accessibility & performance (CLI/TST)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P5-CLI-03 | Accessibility | Reduced-motion mode; colorblind-safe light palettes; input options | Reduced-motion + colorblind palettes selectable; verified | P5-CLI-01 | 2d |
| P5-TST-01 | Load test vs targets | Run P4 load scenarios; verify CCU/latency/FPS SLAs | All P4-TST-01 targets met or gaps ticketed | P4-TST-01 | 1.5d |
| P5-CLI-04 | Performance pass | Optimize render/queries to meet budgets (batching, atlasing, query tuning; add Redis cache only if needed) | FPS + p95 latency within budget on target hardware | P5-TST-01 | 2d |

#### Epic P5.D — Cold-start validation & beta (TST/OPS/CNT) — *per gd-1/gd-c1, risk-5*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P5-TST-02 | Cold-start validation | New player must encounter **≥3 traces within 60s** of landing | Automated/manual check passes across entry points | P3-CNT-01 | 0.5d |
| P5-TST-03 | Zero-moderation-under-load | Simulate 100 players + high placement rate; verify curated-text = no moderation incidents + bot gates accept valid players | Load run produces zero moderation incidents; gates pass legit traffic | P4-SRV-10 | 1d |
| P5-OPS-01 | Closed beta run | Recruit 50–100 players; run ~2 weeks; collect retention + qualitative feedback | Beta live; D1/D7 + feedback captured (targets: D1≥25%, D7≥12% interim) | P5-CLI-01 | 2d |
| P5-CNT-05 | Density top-up | If density audit shows sparse chunks, author +50 seed traces | Post-audit, no visited chunk below target density | P5-OPS-01 | 1d |
| P5-GOV-01 | P5 review gate | Polish/accessibility/perf review | Sign-off; open issues ticketed | P4-GOV-01 | 0.5d |

**Exit criteria:** production art + adaptive audio integrated; accessibility shipped; perf targets met; cold-start validated; closed beta run with data.
**Demo script:** the full game in final art/audio → toggle reduced-motion + colorblind palette → show a load-test report meeting targets → walk the beta density audit.
**Phase risks:** **art/audio schedule slip (the long-pole — see §4 critical path)**; perf gaps under real content (mitigated by P5-TST-01 before polish sign-off).

---

### P6 — Soft launch  ·  *ongoing*

**Goal & demo:** Instrumented soft launch: dashboards, tuning, live-ops dry run, marketing beats, and a
defensible **go/no-go** decision against the scope §12 launch gate.

**Entry preconditions:** P5 exit met; beta data in hand.

#### Epic P6.A — Metrics & dashboards (ANL)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P6-ANL-01 | Success dashboards | Dashboards for activation (>55% place-a-trace S1), D1/D7/D30, appreciation rate, session length, payer conversion, ARPDAU, Trail Pass attach | All §12 metrics visible + trending | P4-ANL-01 | 1.5d |
| P6-ANL-02 | Analytics QA | End-to-end verify every instrumented event fires correctly with correct props | No missing/duplicated core events | P6-ANL-01 | 1d |

#### Epic P6.B — Live-ops & operations (OPS)
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P6-OPS-01 | Backup/restore runbook | Document + rehearse prod Postgres backup/restore | **AC:** restore from a 1-week-old snapshot in <1 hr, rehearsed | P4-DATA-01 | 1d |
| P6-OPS-02 | Live-ops dry run | Run a full season cycle in staging: rotate rewards, tune caps, seed events | Season rotation + tuning proven without code deploy | P4-SRV-01 | 1d |
| P6-OPS-03 | Post-beta density audit | Measure `chunk_state.trace_count` + warmth distribution; validate launch density | No chunk below target; else trigger P5-CNT-05-style top-up | P5-OPS-01 | 0.5d |
| P6-OPS-04 | Marketing beats | Prepare share-friendly moments (appreciation, shrine milestones) as capture/share hooks | Shareable moments produce clips/screens; PR hook ready | P3-SRV-04 | 1d |

#### Epic P6.C — Launch gate (GOV) — *per risk-3/risk-7*
| ID | Title | Description | AC | Deps | Est |
|----|-------|-------------|----|------|-----|
| P6-GOV-01 | Go/No-Go decision | Compare metrics to §12 targets; decision authority = Artur + metrics; document rationale + fallback if no-go | Decision recorded; if no-go, specific issues logged + next-gate date set | P6-ANL-01, P6-OPS-03 | 0.5d |

**Exit criteria (= scope §12 launch gate, validated):**
1. Full trace loop stable at target density with fade/GC keeping chunks curated → validated by P5-TST-01 + P6-OPS-03.
2. A cohort can play daily for 4+ weeks without content feeling exhausted → validated by P5-OPS-01 beta + one season.
3. Payment + Trail Pass live and reconciled; store functional → validated by P4-TST-02.
4. Zero-moderation-incident target validated under load → validated by P5-TST-03.
**Demo script:** dashboards vs targets → reconciliation clean → density audit healthy → documented go/no-go.
**Phase risks:** retention below target at gate (fallback: defer launch, run engagement pass, re-gate); discovery/marketing in a crowded space (lean on share-friendly emotional moments).

---

## §4 · Milestone & dependency map

### Cross-phase critical path
```
P0 coord+determinism ─► P1 schema+chunk-read ─► P1 trace-write ─► P2 full traces+jobs ─► P3 accounts+appreciation ─► P4 season+payments ─► P5 perf+beta ─► P6 gate
                                                                     │
CONTENT (art/audio) ── spec@P0 ─ placeholders ─ signpost content@P1 ─ seed corpus@P3 ─────────────► PRODUCTION ART/AUDIO @P5 (LONG-POLE) ─┘
ANALYTICS ── schema@P0 ─ activation@P1 ─ retention@P2 ─ return-rate@P3 ─ monetization@P4 ─────────► dashboards@P6
```

### The art/audio long-pole (scope §13)
Production art/audio is the pacing item. Mitigations baked into this plan:
- **Start at P0** (direction spec + placeholders), not after code.
- **Signpost content in P1**, seed corpus in P3 — content work interleaves, not stacks.
- **Handoff dependency:** client must render all cosmetic families (≥8 lantern colors, cloak/trail/glyph)
  by **P3 exit** (P3-CLI-03) so the **P4 store** can sell them.
- **P5 decomposed** into weekly art/audio slices (tileset → cosmetics → audio+a11y → integration) so slip
  is visible early. If P5 art slips, P6 launch date moves — it does **not** compress QA.

### Risk register (scope §14 → owning phases)
| Risk | Severity | Owner | Owning tasks |
|------|----------|-------|--------------|
| Empty-world cold start | High | Content + Eng | P2-SRV-08/P2-CNT-01 (mechanism+seed) · P3-CNT-01 (corpus) · P4-CNT-01 (top-up) · P5-TST-02 (≥3 in 60s) · P6-OPS-03 (density audit) |
| "Cozy" content-thin | Med | Design + Content | P2 appreciation loop · P3-SRV-04 notifications · P4-SRV-01 seasons · P1-CNT-01/02 + P5 content budget |
| Monetization too light | Med | Product (Artur) | P4-SRV-02 Trail Pass (recurring) · INFRA low fixed cost · P4-ANL-01/P6-ANL-01 (measure) |
| Abuse w/o free text | Low | Backend Eng | P1-SRV-06 gates · P2-SRV-07 fade · P4-SRV-09 report · P4-SRV-10 bot-resistance · P5-TST-03 load |
| Discovery/marketing | Med | Product (Artur) | P6-OPS-04 share-friendly moments · appreciation/shrine hooks · unique-hook PR |

---

## §5 · Appendices

### §5.A · Data model reference (scope §8.3)
| Table | Key fields | Introduced |
|-------|-----------|------------|
| `player` | id, device_token, email?, created_at, motes, cosmetics_owned(jsonb), pass_tier | P1-DATA-02 |
| `trace` | id, type, chunk_x, chunk_y, x, y, author_id, payload(jsonb), warmth, appreciations, created_at, expires_at | P1-DATA-03 |
| `chunk_state` | chunk_x, chunk_y, warmth, footfall(jsonb), trace_count, updated_at | P1-DATA-04 |
| `appreciation` | id, trace_id, from_id, created_at · UNIQUE(trace_id, from_id) | P1-DATA-05 |
| `journal_event` | id, player_id, kind, ref_id, created_at | P2-DATA-02 |
| `season` / `pass_progress` | season_id, player_id, xp, claimed(jsonb) | P4-DATA-01 |
| `report` | id, trace_id, reporter_id, reason, status | P4-DATA-03 |
| *(embers)* | currency column(s) on player, separate from motes | P4-DATA-02 |

### §5.B · API endpoint catalog (MVP)
| Endpoint | Method | Purpose | Phase |
|----------|--------|---------|-------|
| `/health` | GET | Liveness | P1 |
| `/session` | POST | Anonymous bootstrap / device token | P1 |
| `/world/chunks?ids=` | GET | Capped, prioritized traces + warmth per chunk | P1 |
| `/trace` | POST | Place signpost/lantern (P1); gift/shrine (P2) | P1–P2 |
| `/trace/:id/appreciate` | POST | Appreciate (idempotent), reward author | P1 |
| `/trace/:id/claim` | POST | Claim a gift | P2 |
| `/trace/:id/light` | POST | Light a lantern | P2 |
| `/trace/:id/report` | POST | Report a trace | P4 |
| `/heat` | POST | Batched movement heat samples | P2 |
| `/journal` | GET | Personal history feed | P2 |
| `/auth/upgrade` | POST | Anon→email upgrade | P3 |
| `/notifications` | GET | Appreciation summaries | P3 |
| `/store/*`, `/pass/*`, `/purchase` | GET/POST | Store, Trail Pass, payments | P4 |
| `/ads/reward` | POST | Rewarded-ad grant | P4 |
| `/admin/*` | * | Moderation + live-ops (authz-gated) | P4 |

### §5.C · Content budget checklist (scope §7)
| Item | Target | Phase | Stream | QA gate | Status |
|------|--------|-------|--------|---------|--------|
| Tileset (terrain types) | 4–5 | P5 | CNT/CLI | Director review + FPS budget | ☐ |
| Props | ~20 | P5 | CNT | Director review | ☐ |
| Trace visual families × recolors | 5 × ~4 | P5 | CNT | Renders for all trace types | ☐ |
| Shrine | 1 | P0/P5 | CNT | Landmark + final art | ☐ |
| Signpost templates | ~40 | P1 | CNT | On-theme + slot-valid | ☐ |
| Word banks | per template | P1 | CNT | No offensive terms | ☐ |
| Season cosmetic set | ~25 | P5 | CNT | Matches spec P3-CNT-02 | ☐ |
| Adaptive music bed + layers | 1 | P5 | CNT | Adapts to warmth | ☐ |
| Authored seed traces | 40–50 (+top-ups) | P3/P5 | CNT | Density audit passes | ☐ |

### §5.D · Analytics instrumentation map (scope §12)
| Event | Metric it feeds | §12 target | Instrumented |
|-------|-----------------|-----------|--------------|
| `session_start` | sessions/day, session length | benchmark | P0 |
| `place_trace` | **Activation** (% placing a trace in S1) | > 55% | P1 |
| `discover_trace` | discovery volume | — | P1 |
| `appreciate_trace` | appreciations given per DAU | pro-social loop | P1/P2 |
| `receive_appreciation` | % traces with ≥1 appreciation | pro-social loop | P2 |
| `return_post_appreciation` | return rate after notification | key retention | P3 |
| *(cohort/day)* | D1 / D7 / D30 | D1>35%, D7>15% | P3–P6 |
| `purchase` | payer conversion, ARPDAU, Trail Pass attach | 2–5% payer | P4 |

### §5.E · Definition-of-done / launch-gate checklist (scope §12)
| DoD criterion | Validated in | Validation task | Decision authority | Fallback if failed |
|---------------|-------------|-----------------|--------------------|--------------------|
| Full trace loop stable at density; fade/GC curates | P5/P6 | P5-TST-01, P6-OPS-03 | Metrics + Artur | Tune caps/GC; re-test before gate |
| Cohort plays daily 4+ weeks (one season) | P5/P6 | P5-OPS-01 beta + P4-SRV-01 season | Artur + retention data | Add content/season depth; re-gate |
| Payment + Trail Pass live + reconciled; store works | P4 | P4-TST-02 | Metrics | Fix reconciliation; block launch until clean |
| Zero-moderation target under load | P5 | P5-TST-03 | Artur | Harden gates; re-run load |
| Activation > 55% (place a trace in S1) | P6 | P6-ANL-01 | Metrics | Onboarding/composer polish pass |
| D1 > 35% / D7 > 15% | P6 | P6-ANL-01 | Artur + metrics | Engagement pass; defer open launch |

### §5.F · Glossary
- **Trace** — a player-placed persistent object (signpost, gift, lantern, shrine offering) shown to later visitors. Footpaths are emergent (not placed).
- **Mote** — earned soft currency (explore/collect/first-light/receive-appreciation); spent on placing traces + free-tier cosmetics.
- **Ember** — bought premium currency; **separate from motes**; buys cosmetics only (guardrail §9).
- **Warmth** — per-chunk value (traces + lights + footfall) driving lush/glowing visual state; the world's visible memory.
- **Attunement** — non-power cosmetic/expressive unlock track earned by play.
- **Trail Pass** — seasonal free + premium cosmetic/boost track; primary recurring revenue.
- **The First Vale** — the single MVP region. **The Waking Vale** — the launch season.

### §5.G · Post-MVP backlog (scope §6 out-of-scope + §15) — *for scope discipline*
Real-time co-presence ("Encounters") · free-text/voice chat (never) · multiple regions / expansion / fast travel / mounts · friends/guilds/direct targeting · native apps / Steam / console · player housing/plots · emote-glyph language / cosmetic crafting · creator tools / authored trails & events. *Anything logged here by a GOV scope-audit stays deferred unless Artur explicitly promotes it.*

---

*Generated by `/v-team`. Estimates are ideal-days, not calendar commitments. Update task statuses at each phase-exit review.*
