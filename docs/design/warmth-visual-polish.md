# Warmth Visual Polish — P5-CLI-02

> **Status: DRAFT — In Review, pending art-director sign-off on the final render approach.**
> Finalizes the warmth rendering the P2 prototype left as a documented decision (`warmthVisual.ts`).

## Decision: sprite-overlay first, shader if budget allows

The P2 prototype (`client/src/world/warmthVisual.ts`) exposes a stable contract — per-chunk
`{ tier, lushness, tint }` — and documented two shell options. This spec **recommends shipping the
sprite-overlay path** (one additively-blended tinted quad per visible chunk, alpha = `lushness`):

- Cheap and within the existing PixiJS container model (no shader pipeline to maintain).
- Meets the FPS budget (P4-TST-01) with headroom at max chunk density.
- A fragment shader (per-tile lushness ramp, animated glow, volumetric light) is the richer option and
  is kept as a **fast-follow** if the P5-TST-01 load run shows FPS headroom — the data contract does not
  change, so it's a shell swap.

## Accessibility integration (P5-CLI-03 — already in code)

Warmth tints come from `shared/accessibility.ts` `WARMTH_TINTS_BY_MODE` and the client core
`warmthTintForTier(settings, tier)`, so the polished overlay is colorblind-safe by construction, and
glow pulsing is multiplied by `motionScale(settings)` (reduced-motion calms, not freezes).

## AC (from breakdown)

- Warm areas are visibly lush/glowing; within FPS budget on target hardware.
- Reduced-motion + colorblind palettes selectable and verified (see `accessibility.test.ts`).

## Open questions for the director

1. Approve sprite-overlay-first (recommended) vs commit to the shader now.
2. Sign off the 5-tier tint ramps (default + 3 colorblind modes) for final look.
