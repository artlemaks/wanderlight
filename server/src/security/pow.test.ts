import { describe, it, expect } from 'vitest';
import { verifyPow, solvePow, newAccountEarnFactor } from './pow';

describe('proof-of-work bot resistance', () => {
  it('accepts a solved nonce and rejects a wrong one (difficulty 2 for test speed)', () => {
    const challenge = 'wl-challenge-abc';
    const nonce = solvePow(challenge, 2);
    expect(nonce).not.toBeNull();
    expect(verifyPow(challenge, nonce!, 2)).toBe(true);
    expect(verifyPow(challenge, 'definitely-not-it', 2)).toBe(false);
    expect(verifyPow(challenge, '', 2)).toBe(false);
  });

  it('a solution for one challenge does not satisfy another', () => {
    const nonce = solvePow('challenge-A', 2)!;
    expect(verifyPow('challenge-B', nonce, 2)).toBe(false);
  });
});

describe('newAccountEarnFactor', () => {
  it('throttles fresh accounts and ramps to full earn over an hour', () => {
    expect(newAccountEarnFactor(0)).toBe(0.5);
    expect(newAccountEarnFactor(30 * 60 * 1000)).toBeCloseTo(0.75);
    expect(newAccountEarnFactor(60 * 60 * 1000)).toBe(1);
    expect(newAccountEarnFactor(2 * 60 * 60 * 1000)).toBe(1);
  });
});
