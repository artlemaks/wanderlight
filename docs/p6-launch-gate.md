# P6 Soft Launch — Metrics, Dashboards & Go/No-Go Gate (P6-ANL-01/02, P6-GOV-01)

> The soft-launch gate. **The go/no-go decision is Artur's** (decision authority = Artur + metrics per
> scope §12) — this doc is drafted to completion and marked **In Review**; it is **not** self-granted
> (`director-signoff-not-self-granted`).

## P6-ANL-01 — Success dashboards (spec is code)

The dashboard spec lives as tested data in `shared/src/dashboards.ts` (`SUCCESS_DASHBOARDS`) — each §12
metric mapped to its canonical event(s) + target:

| Dashboard                               | Events                         | §12 target         |
| --------------------------------------- | ------------------------------ | ------------------ |
| Activation (placed a trace in S1)       | `place_trace`, `session_start` | > 55%              |
| Discovery volume                        | `discover_trace`               | benchmark          |
| Appreciations given / DAU               | `appreciate_trace`             | pro-social         |
| % traces with ≥1 appreciation           | `receive_appreciation`         | pro-social         |
| Return rate after appreciation          | `return_post_appreciation`     | key retention      |
| D1/D7/D30 retention                     | `session_start` (cohorted)     | D1 > 35%, D7 > 15% |
| Session length                          | `session_start`                | benchmark          |
| Payer conversion · ARPDAU · Pass attach | `purchase`                     | 2–5% payer         |

## P6-ANL-02 — Analytics QA

**AC:** every instrumented event fires correctly with correct props; no missing/duplicated core events.

- **Coverage (automated):** `dashboards.test.ts` asserts every canonical event feeds ≥1 dashboard and
  every dashboard references only real events (`uncoveredEvents()` is empty).
- **Wire shape (automated):** `analyticsEvent()` is compile-time-checked against `AnalyticsEventProps`;
  the analytics seam unit tests (`observability/analytics.test.ts`, `analytics/posthog.test.ts`) prove
  events serialize once through the guarded PostHog seam.
- **End-to-end (deployed):** with PostHog activated, walk the funnel once and confirm each event lands
  with correct props (manual QA against the live project) before opening the gate.

## P6-GOV-01 — Go / No-Go (launch-gate checklist, scope §12)

| DoD criterion                                       | Validated by                                                             | Status                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| Full trace loop stable at density; fade/GC curates  | `density.perf.test.ts`, `coldstart.integration.test.ts`, P6-OPS-03 audit | code-green; **needs live density audit** |
| Cohort plays daily 4+ weeks (one season)            | P5-OPS-01 beta + P4 season                                               | **needs beta data**                      |
| Payment + Trail Pass live + reconciled; store works | `p4.integration.test.ts`, `reconcile.test.ts` (P4-TST-02)                | code-green; **needs real provider**      |
| Zero-moderation target under load                   | `coldstart.integration.test.ts` (P5-TST-03)                              | code-green; **needs live load run**      |
| Activation > 55%                                    | P6-ANL-01 dashboard                                                      | **needs live data**                      |
| D1 > 35% / D7 > 15%                                 | P6-ANL-01 dashboard                                                      | **needs live data**                      |

### Decision

- [ ] **Artur** — review dashboards vs §12 targets → **Go** or **No-Go**.
- If **No-Go:** log the specific failing criteria + set a next-gate date; fallback per §12 (tune
  caps/GC, engagement/onboarding pass, add season depth) then re-gate. **Do not** compress QA.
- Decision + rationale recorded here on the day.

## What blocks a real launch (external, not code)

Everything above marked **needs …** requires a deployed environment + real players + an activated
payment provider + PostHog. The **code, schema, jobs, and tests are complete and green**; the remaining
gates are operational/commercial decisions and live-data collection that only Artur can run and sign.
