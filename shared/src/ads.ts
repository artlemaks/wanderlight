/**
 * Rewarded ads (P4-SRV-08 / P4-CLI-03).
 *
 * A strictly **opt-in** "watch for motes" entry point. **Guardrails (scope §9 — binding):** never an
 * interstitial (the player chooses to watch), daily-capped, and the reward is a small mote top-up or a
 * gift charge — **never power**. Pure rules + the daily-cap check; the server is authoritative and
 * verifies ad completion before granting.
 */

/** What a completed rewarded ad grants. Motes or a gift charge — nothing that grants power. */
export type AdReward =
  | { readonly kind: 'motes'; readonly amount: number }
  | { readonly kind: 'gift_charge'; readonly amount: number };

/** The reward for a verified rewarded-ad completion. */
export const REWARDED_AD_REWARD: AdReward = { kind: 'motes', amount: 5 };

/** Max rewarded ads a player may be rewarded for per UTC day (anti-abuse + anti-annoyance). */
export const REWARDED_AD_DAILY_CAP = 5;

/** Milliseconds in a day, for cap-window math. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** The UTC day-bucket for a timestamp (used to reset the daily cap). */
export function adDayBucket(nowMs: number): number {
  return Math.floor(nowMs / DAY_MS);
}

/** Is a new rewarded-ad grant allowed given how many were already granted in the current day bucket? */
export function canGrantAd(grantsToday: number): boolean {
  return grantsToday < REWARDED_AD_DAILY_CAP;
}

/** `POST /ads/reward` response. */
export interface AdRewardResponse {
  readonly granted: boolean;
  readonly reward: AdReward | null;
  readonly motes: number;
  readonly grantsToday: number;
}
