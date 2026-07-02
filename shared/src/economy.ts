/**
 * Motes economy + rate-limit constants (P1-SRV-06).
 *
 * **Motes** are the soft, earn-by-play currency (scope §9). They are NOT embers (the paid premium
 * currency) — traces are never gated behind real money, so nothing here is pay-to-win. Shared so the
 * server enforces the rules authoritatively and the client can preview costs/balances without
 * duplicating magic numbers.
 */

import type { TraceType } from './traces';

/** Mote cost to place each trace type. Server debits on a successful `POST /trace`. */
export const TRACE_PLACEMENT_COST: Readonly<Record<TraceType, number>> = {
  signpost: 10,
  lantern: 5,
};

/** Motes a fresh anonymous player starts with — enough for a first trace to reach activation. */
export const STARTING_MOTES = 30;

/** Motes awarded to a trace's author when someone appreciates it (P1-SRV-07). */
export const APPRECIATION_REWARD_MOTES = 5;

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
