# Audio Direction — Adaptive Ambient Score + Diegetic SFX (P0-CNT-04)

_Status: **DRAFT — awaiting director (Artur) sign-off.** Source task: WM-54 · Epic P0.F._
_References the warmth model and `P5-CNT-04` (adaptive audio, wk3). Pairs with `docs/Art_Direction.md`._

> Draft authored during an autonomous build run to unblock the pipeline and satisfy the "SFX inventory
> drafted" half of the AC. The creative brief below is a proposal; the director should adjust the mood,
> layering rules, and event mapping before this is marked Done.

---

## 1. Vision

Audio is **calm, ambient, and reactive to warmth** — the world sounds more alive the more it has been
wandered. Sound is a reward for presence, never a demand for attention. No music "tracks," no stings of
tension: a continuous, gently-evolving bed with small diegetic sparkles on meaningful moments.

## 2. Pillars

1. **Adaptive, not looped.** The score is layered stems that swell/recede with local **warmth** and
   population, so no two areas sound identical and quiet areas stay quiet.
2. **Diegetic-first.** The memorable sounds are _in the world_ — a chime when you discover a trace, a
   soft tone when someone appreciates yours. They mark the social loop.
3. **Cozy & unobtrusive.** Low dynamic range, soft transients, warm timbres. Comfortable for long,
   unhurried sessions; safe with the reduced-motion / low-stimulation audience.
4. **Silence is allowed.** Cold/untouched areas can be nearly silent. Contrast makes warmth feel earned.

## 3. Adaptive ambient score — layering model

A single ambient bed built from **stacked stems**, each faded in by a driver:

| Layer            | Fades in with                    | Character                                                      |
| ---------------- | -------------------------------- | -------------------------------------------------------------- |
| Base pad         | always (very low)                | Soft sustained drone/pad; the "world is here" floor            |
| Warmth layer     | rising chunk warmth              | Gentle harmonic bloom, warmer timbre, light shimmer            |
| Population layer | nearby traces / footfall density | Subtle melodic motifs, a sense of "others were here"           |
| Biome tint       | terrain band under the traveler  | Timbral color (water = airy/reverberant; forest = woody/close) |

**Rules:**

- Crossfades are **slow** (seconds), never abrupt — movement should feel like drifting between moods.
- Overall level is capped low; layers add _texture and warmth_, not loudness.
- Everything is stem-based so P5 can mix without re-authoring.

## 4. Diegetic SFX inventory (draft)

Mapped to the analytics event taxonomy (`@wanderlight/shared` `ANALYTICS_EVENTS`) and MVP mechanics so
each key moment has a sound. `P` = phase the event lands.

| SFX                        | Trigger                                             | Phase | Character                                               |
| -------------------------- | --------------------------------------------------- | ----- | ------------------------------------------------------- |
| `sfx_footstep`             | Traveler movement (soft, rate-limited)              | P0/P1 | Very soft, warmth-tinted; near-silent on water          |
| `sfx_place_trace`          | `place_trace` — leave a trace                       | P1    | Warm, affirming "bloom" — you left something            |
| `sfx_discover_trace`       | `discover_trace` — find another's trace             | P1    | Bright, curious chime — the signature discovery sound   |
| `sfx_appreciate`           | `appreciate_trace` — give appreciation              | P2    | Gentle two-note "thank-you"                             |
| `sfx_receive_appreciation` | `receive_appreciation` — your trace was appreciated | P2    | Soft warm shimmer (also drives a return notification)   |
| `sfx_lantern_light`        | Light a lantern (P2 lighting)                       | P2    | Kindling → soft glow swell; raises local warmth audibly |
| `sfx_signpost_read`        | Read a signpost/word-bank trace                     | P1    | Faint paper/soft-tone                                   |
| `sfx_ui_soft`              | Minimal UI confirms (journal, menu)                 | P1+   | Muted, non-intrusive                                    |
| `sfx_purchase`             | `purchase` completes (P4)                           | P4    | Warm, understated confirm — never a "jackpot"           |
| `sfx_season_shift`         | Season change (P4)                                  | P4    | Slow ambient transition motif                           |

**Discovery + appreciation are the hero sounds** — they carry the game's social heart and should be the
most crafted, most recognizable cues.

## 5. Constraints & guardrails

- **Accessibility (P5-CLI-03):** never encode required information in audio alone; provide subtitles/
  visual equivalents for diegetic cues; respect a reduced-audio / mute-ambient option.
- **Monetization (§9):** purchase/cosmetic audio stays understated — no pay-to-win fanfare, no
  dark-pattern reward sounds. Cosmetic sounds are equivalent whether earned or bought.
- **Performance:** stem count and voice count fit the P5 audio budget; ambient runs cheaply on the
  reference device.

## 6. Rough production plan (feeds P5-CNT-04)

1. Author base pad + warmth + biome stems (4 biome tints).
2. Author the 10 diegetic SFX above; polish the two hero cues first.
3. Wire warmth/population drivers to layer gains; tune crossfade times.
4. Accessibility + mix pass.

---

## 7. Approval

- [ ] Director (Artur) sign-off — brief mood, layering model, SFX inventory.
- On approval: flip status to **Approved**, mark WM-54 Done, hand off to `P5-CNT-04`.
