# P2 Review Gate & Scope Audit (P2-GOV-01)

**Status:** draft — pending human (Artur) sign-off. Per the `director-signoff-not-self-granted`
indication, this gate is **not** self-transitioned to Done; it is flagged for review.

Phase P2 = "Full trace set + economy + background jobs". This audits what shipped against the plan
and logs what was deliberately deferred.

## Delivered & verified (Done)

All backed by the automated suite (`npm test`, 205 tests green) + `tsc --build` + `eslint`.

| Task                                 | What shipped                                                               |
| ------------------------------------ | -------------------------------------------------------------------------- |
| WM-79 P2-SRV-01 gift trace           | place-with-charge, first-finder claim, author + finder rewards; both repos |
| WM-80 P2-SRV-02 shrine offering      | accumulating per-chunk shrine, warmth, readable state                      |
| WM-81 P2-DATA-01 lantern lit-count   | idempotent lighting → lit_count + chunk warmth                             |
| WM-95 P2-SRV-08 system-trace author  | flagged, never-expiring seed traces (`placeSystemTrace`)                   |
| WM-83 P2-CLI-02 heat sampling        | pure client sampler (cadence + dedup + batch) + `POST /heat`               |
| WM-85 P2-SRV-03 footpath aggregation | scheduler + job folding heat → `chunk_state.footfall` + warmth             |
| WM-87 P2-SRV-04 warmth model         | warmth from traces + lights + offerings + footfall; in chunk read          |
| WM-89 P2-SRV-05 motes economy        | full earn/spend ruleset, server-authoritative, §9-guardrail-cited          |
| WM-91 P2-DATA-02 journal_event       | table + feed; events recorded across the write paths                       |
| WM-93 P2-SRV-06 density cap          | over-cap chunks return only top-priority traces (proven)                   |
| WM-94 P2-SRV-07 fade + GC            | safe GC (never removes fresh/appreciated/lit/system) + warmth fade         |
| WM-97 P2-ANL-01 retention signals    | receive_appreciation fires under the author → PostHog metric               |
| WM-98 P2-TST-01 job tests            | footpath aggregation, GC eligibility/safety, warmth, scheduler             |
| WM-99 P2-TST-02 density/perf         | chunk read <500ms + GC <500ms at 2000-trace density                        |

## Deferred to render-shell / later (In Progress, logged as out-of-scope-for-this-pass)

Per the `pure-core-thin-pixi-shell` convention, the **pure, tested cores** for these landed in P2;
the remaining work is the thin PixiJS/DOM shell (+ animations), which is not verifiable in the
headless CI env and is intentionally left for a UI-wiring pass.

| Task                                   | Core shipped (tested)                                | Remaining (thin shell)                       |
| -------------------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| WM-82 P2-CLI-01 gift/shrine/lantern UI | radial + claim/light availability + typed API client | Pixi widgets + animations, wire into main.ts |
| WM-86 P2-CLI-03 footpath rendering     | `wornFootpaths` (footfall → worn tiles)              | terrain-blend render shell                   |
| WM-88 P2-CLI-04 warmth visual          | `warmthVisual` tiers + P5 approach doc               | overlay shell in chunk renderer              |
| WM-90 P2-CLI-05 mote collection        | deterministic spawns + collect endpoint + HUD model  | in-world mote sprites + HUD widget           |
| WM-92 P2-CLI-06 journal UI             | view-model (labels + summary)                        | DOM journal panel                            |

## Awaiting director sign-off (In Review — creative/scope decisions, not self-granted)

- WM-96 P2-CNT-01 seed pass — `content/seed-traces.json` drafted + `npm run seed:world` mechanism
  verified (13 traces placed). Playtest AC ("every visited chunk shows ≥1 seed trace") needs
  placement/tone sign-off + a playtest.
- WM-100 P2-CLI-07 appreciation-summary UI — design doc drafted (`docs/design/appreciation-summary-ui.md`).
- WM-101 P2-GOV-01 — this audit.

## Guardrail compliance (§9)

Economy work (WM-89/90) respects the monetization guardrails: motes are **earned-only** (no buy-motes
path), separate from embers, grant no power, and cosmetics stay free-earnable. Cited in
`shared/src/economy.ts`. No pay-to-win surface introduced in P2.

## Sign-off

- [ ] Director confirms the deferred client-shell split is acceptable for the P2 gate.
- [ ] Director signs off seed-content placement/tone (WM-96) and appreciation-summary design (WM-100).
- [ ] Any items above re-scoped or pulled forward are logged here before Done.
