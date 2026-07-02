/**
 * Motes economy + rate-limit constants (P1-SRV-06).
 *
 * **Motes** are the soft, earn-by-play currency (scope §9). They are NOT embers (the paid premium
 * currency) — traces are never gated behind real money, so nothing here is pay-to-win. Shared so the
 * server enforces the rules authoritatively and the client can preview costs/balances without
 * duplicating magic numbers.
 */

import type { TraceType } from './traces';

/**
 * Mote cost to place each trace type. Server debits on a successful `POST /trace`. Gifts cost no
 * motes — they are paid for with a **gift charge** (see {@link STARTING_GIFT_CHARGES}) — and shrines
 * are system-authored, never placed by players, so both are `0` here.
 */
export const TRACE_PLACEMENT_COST: Readonly<Record<TraceType, number>> = {
  signpost: 10,
  lantern: 5,
  gift: 0,
  shrine: 0,
};

/** Motes a fresh anonymous player starts with — enough for a first trace to reach activation. */
export const STARTING_MOTES = 30;

/** Gift charges a fresh player starts with. A gift charge is consumed when placing a gift (P2-SRV-01). */
export const STARTING_GIFT_CHARGES = 3;

/** Motes awarded to a trace's author when someone appreciates it (P1-SRV-07). */
export const APPRECIATION_REWARD_MOTES = 5;

/** Motes a finder receives for claiming a gift (P2-SRV-01) — the gift itself. */
export const GIFT_CLAIM_REWARD_MOTES = 10;

/** Motes a gift's author receives when their gift is claimed — the "silent thanks" (P2-SRV-01). */
export const GIFT_AUTHOR_REWARD_MOTES = 5;

/** Mote cost of a single shrine offering (P2-SRV-02). Offerings are repeatable and accumulate. */
export const SHRINE_OFFERING_COST = 5;

/** Warmth one shrine offering adds to its chunk (P2-SRV-02 / warmth model P2-SRV-04). */
export const SHRINE_OFFERING_WARMTH = 1;

/** Warmth one lantern lighting adds to its chunk (P2-DATA-01). */
export const LANTERN_LIGHT_WARMTH = 1;

/** Rate-limit windows (per player and per chunk) guarding trace placement (P1-SRV-06). */
export const RATE_LIMITS = {
  /** Max traces one player may place within `windowMs`. */
  perPlayer: { max: 20, windowMs: 60 * 60 * 1000 },
  /** Max traces any single chunk accepts within `windowMs` (anti-spam / density protection). */
  perChunk: { max: 30, windowMs: 60 * 60 * 1000 },
} as const;

/** Cost for `type`, or `undefined` if it is not a placeable trace type. */
export function placementCost(type: TraceType): number {
  return TRACE_PLACEMENT_COST[type];
}
