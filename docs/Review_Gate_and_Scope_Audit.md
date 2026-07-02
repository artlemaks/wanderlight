# Review Gate & Scope-Audit Process (P0-GOV-01)

_Status: **active** — applied from P1 onward. Owner: Artur (director / maintainer)._
_Source task: WM-55 · Epic P0.F · references `docs/MVP_Task_Breakdown.md` §6 (in-scope), §7 (content budget), §9 (monetization guardrails)._

This is the human gate every change passes before it counts as **Done**, plus the per-phase
scope-audit that keeps the MVP from drifting. It is deliberately lightweight — one director, one
checklist — so it never becomes the bottleneck the game's "cozy, unhurried" tone is trying to model.

---

## 1. Definition of Done (per work item)

A task is **Done** only when all rows that apply to its type are satisfied.

### 1.1 Code / infra tasks

| Gate                       | How it's checked                                                                                        | Enforced by            |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| Static analysis passes     | `npm run typecheck` + `npm run lint` clean                                                              | CI (blocks merge)      |
| Tests green                | `npm test` green, incl. any new unit/integration tests for the change                                   | CI (blocks merge)      |
| CI pipeline green          | The PR's `typecheck · lint · test · build` job is green                                                 | CI + branch protection |
| Human functional check     | Reviewer exercises the actual behavior (not just tests) — the `/verify`-style "drive the flow" step     | Director               |
| Human visual check (if UI) | Reviewer looks at the running client for the changed surface                                            | Director               |
| AC met & evidenced         | Every acceptance criterion in the ticket is demonstrably satisfied; evidence linked in the Jira comment | Director               |
| Scope clean                | Nothing outside the ticket's scope crept in (see §2)                                                    | Director               |

**Credential-gated ACs** (e.g. "appears in the Sentry/PostHog dashboard"): the code + emit path is
verified and unit-covered; the _live_ half is confirmed once the key/DSN is provisioned. Such a task
may be marked Done under the [guarded-integration](../VAULT.md) pattern **only if** the ticket comment
explicitly records what is verified vs. what awaits activation.

### 1.2 Art / audio / content tasks

| Gate                                        | How it's checked                                                 | Enforced by |
| ------------------------------------------- | ---------------------------------------------------------------- | ----------- |
| Director sign-off                           | The art/audio director (Artur) approves the asset or spec        | Director    |
| Within content budget                       | Asset counts / sizes fit the §7 content-budget targets           | Director    |
| Performs at FPS budget (if in-engine)       | Runs within the target frame budget on the reference device      | Director    |
| No placeholder left behind (at integration) | Placeholder art/audio is fully replaced where the ticket says so | Director    |

### 1.3 Monetization tasks (P4+)

In addition to §1.1, **every monetization AC must cite and hold to §9 guardrails**
(motes ≠ embers, no pay-to-win, cosmetics stay free-earnable). A guardrail violation **blocks merge** —
no exceptions. See the `monetization-guardrails-in-ac` indication.

---

## 2. Per-phase scope audit

Run once at the end of each phase (the `P*-GOV-01` ticket), before the phase is called complete.

**Checklist:**

1. **In-scope confirm** — every shipped item maps to a §6 In-Scope line. List them.
2. **Out-of-scope sweep** — diff what shipped against the phase plan. Anything extra is either
   (a) justified and recorded, or (b) logged to the post-MVP backlog (§5.G) and reverted/ticketed.
3. **Budget check** — content counts (art/audio/props/traces) are within §7 targets, or the overage
   is explicitly approved.
4. **Guardrail check** (P4+) — every monetization surface still satisfies §9.
5. **Debt log** — known shortcuts/TODOs are ticketed, not silently carried.
6. **Sign-off recorded** — director records go/no-go in the `P*-GOV-01` ticket with the out-of-scope
   and debt lists attached.

**Exit rule:** a phase is complete only when its `GOV` ticket has a recorded sign-off and an empty (or
consciously-accepted) out-of-scope list.

---

## 3. Roles

- **Director (Artur)** — owns sign-off for code-functional, visual, art/audio, and scope decisions.
- **Implementer (human or agent)** — supplies evidence (CI run, screenshots, logs, AC mapping) in the
  ticket so the gate is a review, not a re-investigation.

---

## 4. Where this applies

- From **P1** onward, every `P*-GOV-01` ticket runs the §2 audit.
- The §1 Definition of Done applies to **all** tickets, all phases, retroactively.
