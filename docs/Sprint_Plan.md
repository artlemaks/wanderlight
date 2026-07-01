# Wanderlight — Sprint Plan (2-week cadence)

Derived from [`MVP_Task_Breakdown.md`](MVP_Task_Breakdown.md) and mirrored into Jira project **WM**
(Wanderlight-MMO). Phases P0–P6 are sliced into **12 two-week sprints**. Each Jira issue carries a
`sprint-N` label matching this table, alongside its `phase-P{n}` and stream labels.

> **Why labels, not native sprints:** the available Jira automation can create issues and set labels
> but cannot create board sprints or assign issues to them. To turn this plan into real sprints:
> in the WM board go to **Backlog**, create 12 sprints, then for each `sprint-N` label filter the
> backlog by that label and bulk-move the matching issues into the corresponding sprint. One filter +
> drag per sprint.

## Cadence

Two-week sprints. Phase durations from the breakdown: P0 ≈1–2wk, P1 ≈2wk, P2 ≈2wk, P3 ≈2wk,
P4 ≈2–3wk, P5 ≈3wk, P6 ≈1wk. Epics are kept whole within a sprint and ordered to respect
cross-epic dependencies (foundations first).

| Sprint | Phase | Epics | Focus | Tasks |
|--------|-------|-------|-------|-------|
| **1** | P0 | P0.A, P0.B, P0.C | Repo/tooling bootstrap · chunk coord system · deterministic world | 10 |
| **2** | P0 | P0.D, P0.E, P0.F | Movement + camera · analytics foundation · content/governance kickoff | 9 |
| **3** | P1 | P1.A, P1.B, P1.C | Data schema & migrations · API scaffold + spatial reads · trace writes | 12 |
| **4** | P1 | P1.D, P1.E, P1.F | Client trace loop · signpost content · analytics/tests/governance | 11 |
| **5** | P2 | P2.A, P2.B, P2.C | Remaining trace types · footpaths & warmth · economy & journal | 13 |
| **6** | P2 | P2.D, P2.E, P2.F | Density cap + fade/GC · cold-start seeding · analytics/tests/governance | 9 |
| **7** | P3 | P3.A–P3.E | Accounts & auth · appreciation notifications · cosmetics · seed corpus · tests/gov | 15 |
| **8** | P4 | P4.A, P4.B, P4.C | Season & Trail Pass · store/embers/guardrails · payments & reconciliation | 11 |
| **9** | P4 | P4.D, P4.E, P4.F | Rewarded ads · admin/moderation/abuse · perf/analytics/tests/governance | 12 |
| **10** | P5 | P5.A, P5.B | Production art · audio & warmth polish | 6 |
| **11** | P5 | P5.C, P5.D | Accessibility & performance · cold-start validation & beta | 8 |
| **12** | P6 | P6.A, P6.B, P6.C | Metrics & dashboards · live-ops & operations · launch gate | 7 |

**Total:** 12 sprints · 36 epics · 123 child tasks (+ `P0-INFRA-01`, already done as WM-2 = 124 tasks
in the doc; 123 created here since INFRA-01 pre-existed).

## Notes & sequencing risks
- **Sprint 1 is the true critical path**: P0.B (chunk coords, done — WM-2/ADR-001) and P0.C
  (deterministic terrain) gate all of P1's multiplayer work. Don't let Sprint 1 slip.
- **Sprint 7 (P3) is the heaviest at 15 tasks** — P3 is a single 2-week phase in the breakdown. If
  velocity data after Sprints 1–6 shows this is too much, split P3 into two sprints (A–C, then D–E)
  and renumber downstream.
- **Content (art/audio) runs in parallel**, not just in its labelled sprint — CNT direction specs
  start Sprint 2 (P0.F) and production art is the long pole in Sprints 10–11. Track CNT tasks as a
  parallel swimlane, not a strictly serial sprint item.
- **Analytics** threads P0→P6; each phase's `-ANL-` tasks live in that phase's governance sprint.

## Jira label conventions (WM)
- `phase-P{0..6}` — which MVP phase.
- `sprint-{1..12}` — this plan's sprint.
- stream label — `infra` · `cli` · `srv` · `data` · `anl` · `cnt` · `gov` · `tst` · `ops`.
- `wanderlight` — project-wide tag.
- Hierarchy: **Epic** (`P{n}.{X} — …`) → **Task** (`P{n}-STREAM-## — …`), task parented to its epic.
