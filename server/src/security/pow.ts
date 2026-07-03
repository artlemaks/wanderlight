/**
 * Proof-of-work bot resistance (P4-SRV-10).
 *
 * A light hashcash-style speed bump for a player's *first* write: the client must find a nonce whose
 * SHA-256(`challenge:nonce`) has `difficulty` leading zero **hex** digits. Cheap for a human's browser
 * (milliseconds), costly at bot scale. Server-side verification only — no SDK, no lockfile dep.
 *
 * Guarded/off by default (env `BOT_RESISTANCE=1`) so it never blocks CI or local dev, mirroring the
 * other optional integrations. Also documents the companion measure (reduced initial earn for brand-new
 * anon accounts) via {@link newAccountEarnFactor}.
 */

import { createHash } from 'node:crypto';

/** Default leading-zero-hex-digit difficulty. 4 ≈ 16^4 hashes (~ms in a browser, painful at bot scale). */
export const DEFAULT_POW_DIFFICULTY = 4;

/** Hash `challenge:nonce` and report how many leading '0' hex digits it has. */
function leadingZeros(challenge: string, nonce: string): number {
  const hex = createHash('sha256').update(`${challenge}:${nonce}`).digest('hex');
  let n = 0;
  while (n < hex.length && hex[n] === '0') n += 1;
  return n;
}

/** Verify a proof-of-work solution meets the difficulty. */
export function verifyPow(
  challenge: string,
  nonce: string,
  difficulty: number = DEFAULT_POW_DIFFICULTY,
): boolean {
  if (typeof nonce !== 'string' || nonce.length === 0) return false;
  return leadingZeros(challenge, nonce) >= difficulty;
}

/**
 * Solve a challenge (used by tests + the client reference). Returns the first nonce meeting difficulty.
 * `start`/`limit` bound the search so it can't loop forever in a test.
 */
export function solvePow(
  challenge: string,
  difficulty: number = DEFAULT_POW_DIFFICULTY,
  limit = 5_000_000,
): string | null {
  for (let i = 0; i < limit; i += 1) {
    const nonce = String(i);
    if (leadingZeros(challenge, nonce) >= difficulty) return nonce;
  }
  return null;
}

/**
 * Anti-farming earn factor for brand-new anonymous accounts (P4-SRV-10): reduce initial earn until an
 * account has some age, so mass-minted bot accounts can't farm motes on day zero. Ramps 0.5 → 1.0 over
 * the first hour. Pure; the economy can multiply earns by this. (Not wired into live earns by default —
 * documented + tested; activation is an economy-tuning decision.)
 */
export function newAccountEarnFactor(accountAgeMs: number): number {
  const RAMP_MS = 60 * 60 * 1000;
  if (accountAgeMs >= RAMP_MS) return 1;
  if (accountAgeMs <= 0) return 0.5;
  return 0.5 + 0.5 * (accountAgeMs / RAMP_MS);
}
