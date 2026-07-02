# Cosmetic Design Specs — P3-CNT-02 (handoff to P5 art)

> **Status: DRAFT — In Review, pending art-director (Artur) sign-off.**
> Per `director-signoff-not-self-granted`, this spec is drafted to completion but **not** self-approved.
> It defines the full cosmetic set so P5 art (P5-CNT-03, ~25 items) can execute against a frozen list.

## Guardrails (scope §9 — binding)

Every cosmetic below is **pure self-expression**. None grants gameplay power, none alters another
player's world, and **every item is reachable through free play** via the attunement track
(`shared/src/cosmetics.ts`). The P4 store (P4-SRV-03) may sell the same items for **embers** as a
_shortcut only_ — never as the sole path. This spec is the source of truth the store catalog references.

## Families & catalog

The shipped catalog lives in `shared/src/cosmetics.ts` (`COSMETICS`). This doc is its art brief.

| Category       | Slot                | Items (catalog id → name)                                                                                                    | Free path                    |
| -------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Cloak          | traveler body       | `cloak.wanderer` Wanderer · `cloak.mist` Mistweave · `cloak.dawn` Dawnfall · `cloak.forest` Deepwood · `cloak.dusk` Duskveil | default + attunement 1/3/5/7 |
| Glyph          | traveler emote-mark | `glyph.none` · `glyph.spiral` · `glyph.leaf` · `glyph.star`                                                                  | default + attunement 2/4/6   |
| Trail          | movement trail      | `trail.none` · `trail.sparkle` · `trail.petal` · `trail.glow`                                                                | default + attunement 2/4/6   |
| Lantern color  | lantern light hue   | `lantern.amber/rose/jade/azure/violet/ember/frost/gold` (8)                                                                  | default + attunement 1–7     |
| Signpost frame | signpost border     | `frame.plain/carved/vine/stone`                                                                                              | default + attunement 3/5/7   |
| Gift wrap      | gift wrapping       | `wrap.simple/ribbon/bloom/woven`                                                                                             | default + attunement 2/4/6   |

**Total: 29 items** (one default per category + 23 attunement unlocks). Season-exclusive recolors for
"The Waking Vale" (P4) will add ~a handful more on top, tracked in the season config, keeping the P5
art budget (§7: ~25 season cosmetic items) intact.

## Attunement track (how it's earned — P3-SRV-05)

Points accrue from play (`ATTUNEMENT_EARN`): place a trace (+3), receive an appreciation (+4),
first-light a lantern (+2), make an offering (+2), claim a gift (+1). Milestone thresholds:
`[0, 25, 60, 120, 200, 320, 480, 700]`. Crossing a threshold grants that milestone's cosmetics —
ownership is _derived_ from the point total server-side, so unlocks never need a migration.

## Art direction notes (for P5-CNT-03)

- Follow the painterly low-detail 2.5D bible (`docs/Art_Direction.md`): soft edges, limited palette,
  warmth-reactive lighting. Cosmetics read at a glance from the traveler's silhouette + lantern glow.
- Lantern colors must stay legible against every warmth tier (they double as the warmth light source).
- Cloaks/trails must not obscure the traveler's facing or the interact-on-approach affordance.
- Deliver each item as a recolor/variant sheet keyed to the trace visual families (P5-CNT-02).

## Open questions for the director

1. Approve the 29-item list + names, or trim/rename before P5 art starts.
2. Confirm season recolors ride on top of this set (vs replacing base variants).
3. Sign off that the free-earn cadence (attunement milestones) feels rewarding, not grindy.
