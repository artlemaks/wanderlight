# Adaptive Audio Spec — P5-CNT-04

> **Status: DRAFT — In Review, pending audio-direction (Artur) sign-off + music/SFX delivery.**
> Drafts the adaptive score + diegetic SFX against `docs/Audio_Direction.md`. Not self-approved.

## Adaptive ambient score

A calm ambient bed with **layers that swell near warm / populated areas** — the audio mirror of the
warmth system. The client already computes per-chunk warmth tiers (`warmthVisual` / `warmthTier`); the
audio layer subscribes to the same tier signal so music and visuals rise together.

| Layer                  | Trigger                               | Behaviour                                   |
| ---------------------- | ------------------------------------- | ------------------------------------------- |
| Base bed               | always                                | Soft pad, low intensity                     |
| Warmth swell           | mean visible warmth tier ≥ 2          | Add strings/pad layer, gain ∝ tier          |
| Gathering              | ≥ N nearby traces / high footfall     | Add gentle melodic motif                    |
| Reduced-motion respect | `AccessibilitySettings.reducedMotion` | Damp layer cross-fades (calmer transitions) |

Cross-fades honor the `motionScale` accessibility multiplier so audio motion calms with visual motion.

## Diegetic SFX (key events)

| Event                             | Client seam                      | Cue            |
| --------------------------------- | -------------------------------- | -------------- |
| Discover a trace on approach      | `trace/read` interact affordance | soft chime     |
| Appreciate / receive appreciation | appreciate flow / return summary | warm bell      |
| First-light a lantern             | `lightLantern`                   | rising shimmer |
| Collect a mote of light           | `mote/collect`                   | light pluck    |
| Shrine offering                   | `makeOffering`                   | resonant tone  |

## AC (from breakdown)

- Audio adapts to warmth; SFX fire on the key events above. Verified in the P5 integration pass.

## Open questions for the director

1. Approve the layer list + swell thresholds (tie to warmth tiers 2/3/4?).
2. Confirm the diegetic SFX inventory matches the audio-direction brief.
3. Music licensing / bespoke composition decision (long-pole).
