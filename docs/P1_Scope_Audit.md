# P1 Review Gate & Scope Audit (P1-GOV-01)

_Status: **In Review** — drafted by the implementer; awaits director (Artur) sign-off. Per the
`director-signoff-not-self-granted` rule this is **not** self-marked Done._
_Runs the §2 checklist from [`Review_Gate_and_Scope_Audit.md`](Review_Gate_and_Scope_Audit.md) against
the P1 "Traces vertical slice" (§3 P1 of `MVP_Task_Breakdown.md`)._

## 1. In-scope confirm — every shipped item maps to a P1 plan line

| Area              | Shipped                                                                           | Task           |
| ----------------- | --------------------------------------------------------------------------------- | -------------- |
| Migration tooling | zero-dep SQL runner + up/down + policy doc                                        | P1-DATA-01     |
| Schema            | `player`, `trace`(+chunk index), `chunk_state`, `appreciation`(UNIQUE) migrations | P1-DATA-02..05 |
| Server scaffold   | `buildApp` factory, health, error handler, reqId, guarded PostHog                 | P1-SRV-01      |
| Session           | anonymous device-token bootstrap + player row                                     | P1-SRV-02      |
| Chunk read        | strategy doc + `prioritizeTraces` + `GET /world/chunks`                           | P1-SRV-03/04   |
| Trace write       | `POST /trace` (signpost, lantern); server-derived chunk + expiry                  | P1-SRV-05      |
| Economy/limits    | mote cost + per-player/per-chunk rate gates                                       | P1-SRV-06      |
| Appreciate        | `POST /trace/:id/appreciate`, idempotent, author reward                           | P1-SRV-07      |
| Client core       | chunk fetch/evict, composer, placement radial, read+appreciate (pure)             | P1-CLI-01..05  |
| Content           | 40 signpost templates + word banks                                                | P1-CNT-01/02   |
| Analytics         | `session_start` / `place_trace` / `appreciate_trace` emitted                      | P1-ANL-01      |
| Tests             | API integration loop + service/unit tests green in CI                             | P1-TST-01      |

## 2. Out-of-scope sweep

No features beyond the P1 plan shipped. Deliberate, recorded deviations:

- **Datastore is in-memory by default**, with a guarded Postgres implementation activated by
  `DATABASE_URL` + `npm i pg`. This is an _implementation strategy_, not extra scope — it keeps CI
  green with zero infra while making the real DB one-line to turn on. Same pattern as Sentry/PostHog.
- Nothing from the post-MVP backlog (§5.G) was pulled forward.

## 3. Budget check

Content within §7 targets: **40** signpost templates (the P1-CNT-01 target) and **8** word banks
(20–40 words each). No art/audio assets in this slice. No overage.

## 4. Guardrail check (§9)

Motes are the earn-by-play soft currency; **no embers / real-money** surface in P1. Trace placement
costs motes only — no pay-to-win. Holds §9. (Full monetization guardrails apply from P4.)

## 5. Debt log (ticketed follow-ups, not silently carried)

- **e2e loop test (P1-TST-02)** — Playwright spec drafted at `client/e2e/trace-loop.spec.ts` but not
  wired into CI (needs `@playwright/test` + a running client/server + browser). Stays **In Progress**.
- **p95 < 150ms (P1-SRV-04)** — index in place; latency to be measured once a Postgres instance + seed
  corpus exist (P2-SRV-08).
- **Content sign-off (P1-CNT-01/02)** — templates/banks are drafts pending director approval;
  `content/*.json` carry `status: draft-pending-director-signoff`.
- **Client render shells** — pure logic is tested; the PixiJS trace sprites / composer widget / radial
  are thin shells whose correctness is a human visual check under this gate.

## 6. Sign-off

- [ ] Director (Artur) go/no-go recorded on WM-78 with the debt list above attached.

**Exit rule reminder:** P1 is complete only once this ticket has a recorded sign-off and an
accepted debt list.
