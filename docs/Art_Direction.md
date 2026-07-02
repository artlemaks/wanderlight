# Art Direction — Painterly Low-Detail 2.5D (P0-CNT-03)

_Status: **DRAFT — awaiting art-director (Artur) sign-off.** Source task: WM-53 · Epic P0.F._
_References `docs/MVP_Task_Breakdown.md` §7 (content budget) and the warmth model (P2.B, P5.B)._
_Once approved, this is the direction bible referenced by all `CNT` tasks (P0-CNT-02 placeholders →
P5-CNT-01/02 production art) and by `P5-CLI-01` art integration._

> This is a **draft authored during an autonomous build run** to unblock the pipeline. The palette
> values, mood, and budget targets are proposals grounded in the existing prototype and scope docs —
> the director should adjust anything that doesn't match the intended feel before this is marked Done.

---

## 1. One-line vision

A hand-painted, unhurried world seen from a gentle 2.5D three-quarter view — **low geometric detail,
high atmospheric warmth** — where the beauty comes from light, color temperature, and the traces other
travelers leave, not from asset density.

## 2. Pillars

1. **Painterly, not pixel, not realistic.** Soft edges, visible brush-feel, limited palette. Readable
   at a glance; rewards a lingering look.
2. **Low-detail on purpose.** Few props, strong silhouettes. Content is the long-pole (§13) — the style
   must look finished with _few_ assets. Legibility over ornament.
3. **Warmth is the mood engine.** A chunk's warmth (raised by traces, lights, footfall) drives its
   visual state from cool/quiet → lush/glowing. This is the primary storytelling channel.
4. **Cozy & safe.** No threat, no clutter, no urgency. Palette and light say "you may wander."

## 3. Camera & space

- **View:** 2.5D three-quarter (slight top-down tilt). Flat gameplay plane; depth implied by layering,
  shadow, and parallax — not by true 3D geometry.
- **Traveler scale:** small in frame; the world reads as larger than the player.
- **Tile size:** matches the engine `TILE_SIZE`; art is authored to that grid.

## 4. Palette

The prototype grey-box palette (`client/src/world/palette.ts`) is the **starting anchor**; production
art keeps the same _hue relationships_ (water→sand→grass→forest→rock) but painterly and warmth-aware.

### 4.1 Base terrain hues (cool / neutral / low-warmth state)

| Band     | Grey-box anchor | Painterly intent                                         |
| -------- | --------------- | -------------------------------------------------------- |
| Water    | `#2a4a6b`       | Deep muted blue; still, reflective, slightly desaturated |
| Sand     | `#c2b280`       | Warm pale ochre; soft grain                              |
| Grass    | `#4a7a3a`       | Muted sage green; more blue-green when cold              |
| Forest   | `#2f5230`       | Deep shadowed green; dense but soft                      |
| Rock     | `#6b6b6b`       | Cool neutral grey with a faint violet undertone          |
| Traveler | `#ffd27f`       | Warm lantern-gold — always the warmest point on screen   |

### 4.2 Warmth states (the color-temperature ramp)

Each band shifts along a **cool → warm** ramp as chunk warmth rises. Three named tiers for P5 to target
(P2 prototypes a basic version):

- **Cold (warmth ~0):** desaturated, blue-shifted, low ambient light. "Untouched."
- **Warm (mid):** saturation returns, hints of gold in the light, lusher foliage.
- **Radiant (high, near lights/dense traces):** warm glow, bloom around light sources, richest color.

Warmth shifts **light and saturation**, not the underlying hue identity — a warm forest is still
clearly forest.

## 5. Light

- Single soft key light (implied sun/ambient), warm.
- Light _sources_ (lanterns, lit traces) are local warmth emitters: gentle glow/bloom, no harsh
  specular. Light is how the world rewards presence.
- Reduced-motion & colorblind-safe variants are required at P5 (`P5-CLI-03`) — palettes must stay
  legible when warmth-glow and particles are toned down; do not encode critical state in hue alone.

## 6. Mood references (descriptive, license-free intent)

Studio-Ghibli-esque painterly calm; _Journey_'s reverent scale and light; watercolor storybook
softness; "golden hour in a quiet meadow." These are **feel** references, not assets to copy.

## 7. Content-budget targets (§7 alignment)

MVP is intentionally content-thin; the style must look complete within these caps (final numbers
confirmed at P5-CNT-01/02):

| Category              | P0–P2 (placeholder/prototype) | P5 production target              |
| --------------------- | ----------------------------- | --------------------------------- |
| Terrain bands         | 5 (flat colors)               | 4–5 painterly tilesets            |
| Environment props     | 0                             | ~20 total                         |
| Trace visual families | —                             | 5 families × ~4 recolor variants  |
| Cosmetics             | —                             | per P3-CNT-02 spec, within budget |

Rule of thumb: **prefer recolor/warmth variants over new assets.** One prop that reads well across the
warmth ramp beats three that don't.

## 8. What this direction is NOT

- Not realistic, not high-poly, not pixel-art.
- Not detail-dense — no busy textures, no prop clutter.
- Not threatening or high-contrast — nothing that reads as danger or UI noise.

---

## 9. Approval

- [ ] Director (Artur) sign-off — palette, warmth ramp, mood, budget.
- On approval: flip status to **Approved**, mark WM-53 Done, and reference this file from all `CNT`
  tickets.
