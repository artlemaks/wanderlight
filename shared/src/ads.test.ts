import { describe, it, expect } from 'vitest';
import { REWARDED_AD_REWARD, REWARDED_AD_DAILY_CAP, canGrantAd, adDayBucket, DAY_MS } from './ads';

describe('rewarded ads (§9 guardrails)', () => {
  it('rewards motes/gift-charges only, never power', () => {
    expect(['motes', 'gift_charge']).toContain(REWARDED_AD_REWARD.kind);
    expect(REWARDED_AD_REWARD.amount).toBeGreaterThan(0);
  });

  it('enforces the daily cap', () => {
    expect(canGrantAd(0)).toBe(true);
    expect(canGrantAd(REWARDED_AD_DAILY_CAP - 1)).toBe(true);
    expect(canGrantAd(REWARDED_AD_DAILY_CAP)).toBe(false);
  });

  it('buckets by UTC day', () => {
    expect(adDayBucket(0)).toBe(0);
    expect(adDayBucket(DAY_MS)).toBe(1);
    expect(adDayBucket(DAY_MS * 3 + 5)).toBe(3);
  });
});
