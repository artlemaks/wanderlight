import { describe, it, expect } from 'vitest';
import { COSMETICS } from './cosmetics';
import { PASS_TRACKS, WAKING_VALE_SEASON, seasonTierForXp, passReward, claimKey } from './season';

const catalogIds = new Set(COSMETICS.map((c) => c.id));

describe('season / Trail Pass', () => {
  it('every cosmetic reward references a free-earnable catalog item (guardrail §9)', () => {
    for (const t of PASS_TRACKS) {
      for (const r of [t.free, t.premium]) {
        if (r && r.kind === 'cosmetic') expect(catalogIds.has(r.cosmeticId)).toBe(true);
      }
    }
  });

  it('rewards are only cosmetic or mote_boost — never power (guardrail §9)', () => {
    for (const t of PASS_TRACKS) {
      for (const r of [t.free, t.premium]) {
        if (r) expect(['cosmetic', 'mote_boost']).toContain(r.kind);
      }
    }
  });

  it('has one row per season tier', () => {
    expect(PASS_TRACKS).toHaveLength(WAKING_VALE_SEASON.tiers);
  });

  it('maps XP to tiers and caps at the season size', () => {
    expect(seasonTierForXp(0)).toBe(0);
    expect(seasonTierForXp(99)).toBe(0);
    expect(seasonTierForXp(100)).toBe(1);
    expect(seasonTierForXp(1_000_000)).toBe(WAKING_VALE_SEASON.tiers);
  });

  it('resolves rewards + claim keys per lane', () => {
    expect(passReward('free', 1)).toEqual({ kind: 'mote_boost', motes: 10 });
    expect(passReward('premium', 1)).toEqual({ kind: 'cosmetic', cosmeticId: 'lantern.rose' });
    expect(passReward('free', 999)).toBeNull();
    expect(claimKey('premium', 3)).toBe('premium:3');
  });
});
