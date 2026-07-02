# P5 Review Gate — P5-GOV-01

> Review gate for the P5 slice (art/audio + polish + beta). **Human sign-off pending.** P5 is the
> long-pole: its creative deliverables (production art, adaptive audio) are drafted to plan + wired to
> integration seams, but marked **In Review** — never self-approved (`director-signoff-not-self-granted`).

## Delivered (code + tests green in CI)

| Epic                       | Tasks                                      | Evidence                                                                                                                                                                |
| -------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P5.A production art        | P5-CNT-01/02/03, P5-CLI-01                 | `docs/design/production-art-plan.md` (In Review); integration seams pinned (`palette.ts`, `warmthVisual.ts`)                                                            |
| P5.B audio + warmth polish | P5-CNT-04, P5-CLI-02                       | `docs/design/adaptive-audio-spec.md`, `docs/design/warmth-visual-polish.md` (In Review)                                                                                 |
| P5.C accessibility + perf  | P5-CLI-03, P5-TST-01, P5-CLI-04            | `shared/accessibility.ts` + `client/accessibility/*` (reduced-motion, colorblind palettes, input option) + tests; `docs/Load_Test_Scenarios.md`; `density.perf.test.ts` |
| P5.D cold-start + beta     | P5-TST-02, P5-TST-03, P5-OPS-01, P5-CNT-05 | `perf/coldstart.integration.test.ts` (≥3 traces on landing; zero-moderation burst); beta runbook (below); density top-up conditional                                    |

## What is code-complete vs awaiting external delivery

**Code-complete + tested now:**

- Accessibility: reduced-motion + colorblind-safe warmth palettes + input option (pure cores + tests).
- Cold-start validation (P5-TST-02): ≥3 traces in the landing 3×3 after seeding — automated.
- Zero-moderation-under-load (P5-TST-03): curated-only placement, no free-text path — automated.
- Warmth-polish + art-integration **seams** (stable data contracts the art swaps into).

**Awaiting external delivery / sign-off (In Review, not self-granted):**

- Production tileset/props/trace-families/cosmetics art (P5-CNT-01/02/03) — art-director + artists.
- Adaptive music + SFX (P5-CNT-04) — audio direction + composition.
- External k6 load run vs deployed env (P5-TST-01) — needs a deployed environment.
- Closed beta (P5-OPS-01) — recruiting 50–100 real players over ~2 weeks; D1/D7 capture.

## P5-OPS-01 closed-beta runbook (outline)

1. Recruit 50–100 players; issue anon links (no signup friction; email upgrade optional).
2. Seed the world (`npm run seed:world`) + confirm cold-start test green.
3. Run ~2 weeks; capture D1/D7 (interim targets D1≥25%, D7≥12%) + qualitative feedback via PostHog.
4. Post-run density audit (P6-OPS-03) → trigger P5-CNT-05 top-up if any visited chunk is thin.

## Reviewer sign-off

- [ ] Artur — approve production-art plan + adaptive-audio spec + warmth-polish approach
- [ ] Artur — accessibility review (reduced-motion + colorblind palettes selectable + verified)
- [ ] Schedule external load run + closed beta (needs deployed environment)
