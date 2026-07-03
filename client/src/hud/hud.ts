/**
 * HUD model (P2-CLI-05) — pure core.
 *
 * The heads-up display shows the traveler's earned-currency state: their mote balance and remaining
 * gift charges. This core derives the display model (values + whether the player can currently afford
 * to place each trace type) from the raw balances + shared economy costs, so the DOM/Pixi HUD shell
 * just renders `HudModel` and never re-implements the cost rules.
 */

import { TRACE_PLACEMENT_COST, type PlaceableTraceType } from '@wanderlight/shared';

export interface HudState {
  readonly motes: number;
  readonly giftCharges: number;
}

export interface HudModel {
  readonly motes: number;
  readonly giftCharges: number;
  /** Per placeable type: can the player afford / has the charge to place it right now? */
  readonly affordable: Readonly<Record<PlaceableTraceType, boolean>>;
}

/** Can the player place `type` given their current balances (motes for signpost/lantern, a charge for gift)? */
export function canAfford(state: HudState, type: PlaceableTraceType): boolean {
  if (type === 'gift') return state.giftCharges >= 1;
  return state.motes >= TRACE_PLACEMENT_COST[type];
}

/** Build the HUD display model from the current balances. */
export function hudModel(state: HudState): HudModel {
  return {
    motes: state.motes,
    giftCharges: state.giftCharges,
    affordable: {
      signpost: canAfford(state, 'signpost'),
      lantern: canAfford(state, 'lantern'),
      gift: canAfford(state, 'gift'),
    },
  };
}
