# Production Art Plan — P5.A (P5-CNT-01/02/03 + P5-CLI-01)

> **Status: DRAFT — In Review, pending art-director (Artur) sign-off + production art delivery.**
> Per `director-signoff-not-self-granted`, this plan is drafted to completion but not self-approved,
> and no placeholder art is declared "final" here. It sequences the long-pole art work (scope §13) into
> the weekly slices from the breakdown and pins the integration seams already in code.

## Weekly slices (scope §13 long-pole; ordered so slip is visible early)

| Slice | Task      | Deliverable                                                       | Content budget (§7)    | Integration seam (in code)                                                          |
| ----- | --------- | ----------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| wk1   | P5-CNT-01 | Real tileset (4–5 terrain types) + ~20 props                      | Tileset 4–5, Props ~20 | `client/src/world/palette.ts` (`TERRAIN_COLORS`) → swap flat fills for tile atlases |
| wk2   | P5-CNT-02 | 5 trace visual families × ~4 recolor variants                     | Trace families 5×~4    | trace sprites keyed by `TraceType`; cosmetic recolors from `COSMETICS`              |
| wk2   | P5-CNT-03 | ~25 season cosmetic items per spec                                | Season set ~25         | `docs/design/cosmetic-specs.md` catalog ids                                         |
| wk4   | P5-CLI-01 | Art integration: replace placeholders; recolor by warmth + season | —                      | `warmthVisual.ts` (tier/lushness contract) + a11y palettes                          |

## Painterly direction (locked bible)

Follows `docs/Art_Direction.md` (painterly low-detail 2.5D, warmth-reactive lighting). The warmth tiers
(`WARMTH_TINTS_BY_MODE`, 5 tiers) are the shared contract every art asset recolors against, so the
sprite-overlay vs shader decision (see `warmth-visual-polish.md`) needs no data change.

## Definition of done (per slice)

- Director review + at FPS budget (P4-TST-01 targets) → no placeholder art remains after P5-CLI-01.
- Warmth recolor works across all 5 tiers **and** all colorblind modes (`shared/accessibility.ts`).
- All cosmetic families (P3-CNT-02 spec) render in final art before the P4-store items go live.

## Open questions for the director

1. Approve tileset terrain count (4 vs 5) + prop list before wk1 starts.
2. Sign off the sprite-overlay-first warmth approach (cheaper) vs committing to a shader now.
3. Confirm season cosmetic count fits the ~25 budget with the P3 catalog + season recolors.
