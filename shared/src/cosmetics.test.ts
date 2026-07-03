import { describe, it, expect } from 'vitest';
import {
  COSMETICS,
  COSMETIC_CATEGORIES,
  ATTUNEMENT_MILESTONES,
  cosmeticById,
  isCosmeticId,
  defaultCosmeticIds,
  defaultEquipped,
  attunementLevel,
  cosmeticsOwnedAtLevel,
} from './cosmetics';

describe('cosmetics catalog', () => {
  it('has one default item per category (a base look is always equippable)', () => {
    for (const cat of COSMETIC_CATEGORIES) {
      const defaults = COSMETICS.filter((c) => c.category === cat && c.unlock.kind === 'default');
      expect(defaults).toHaveLength(1);
    }
  });

  it('ships at least 8 lantern colors (P3-CLI-03 handoff)', () => {
    expect(COSMETICS.filter((c) => c.category === 'lantern_color').length).toBeGreaterThanOrEqual(
      8,
    );
  });

  it('every non-default item is free-earnable on the attunement track (guardrail §9)', () => {
    for (const c of COSMETICS) {
      if (c.unlock.kind === 'default') continue;
      expect(c.unlock.kind).toBe('attunement');
      // Milestone index is real.
      expect(c.unlock.milestone).toBeGreaterThanOrEqual(1);
      expect(c.unlock.milestone).toBeLessThan(ATTUNEMENT_MILESTONES.length);
    }
  });

  it('every attunement item is actually reachable at max level', () => {
    const maxLevel = ATTUNEMENT_MILESTONES.length - 1;
    const owned = new Set(cosmeticsOwnedAtLevel(maxLevel));
    for (const c of COSMETICS) expect(owned.has(c.id)).toBe(true);
  });

  it('rejects unknown ids', () => {
    expect(isCosmeticId('lantern.amber')).toBe(true);
    expect(isCosmeticId('lantern.notreal')).toBe(false);
    expect(cosmeticById('nope')).toBeUndefined();
  });

  it('defaults are owned and equipped from the start', () => {
    const ids = defaultCosmeticIds();
    expect(ids).toContain('lantern.amber');
    const eq = defaultEquipped();
    expect(eq.lantern_color).toBe('lantern.amber');
    expect(Object.keys(eq).sort()).toEqual([...COSMETIC_CATEGORIES].sort());
  });
});

describe('attunement leveling', () => {
  it('maps points to the highest reached milestone', () => {
    expect(attunementLevel(0)).toBe(0);
    expect(attunementLevel(24)).toBe(0);
    expect(attunementLevel(25)).toBe(1);
    expect(attunementLevel(10_000)).toBe(ATTUNEMENT_MILESTONES.length - 1);
  });

  it('unlocks strictly grow with level', () => {
    let prev = 0;
    for (let lvl = 0; lvl < ATTUNEMENT_MILESTONES.length; lvl += 1) {
      const n = cosmeticsOwnedAtLevel(lvl).length;
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
  });
});
