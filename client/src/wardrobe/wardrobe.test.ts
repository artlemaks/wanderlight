import { describe, it, expect } from 'vitest';
import { COSMETICS, defaultEquipped, type CosmeticsResponse } from '@wanderlight/shared';
import { wardrobeModel, canEquip } from './wardrobe';

const res: CosmeticsResponse = {
  catalog: COSMETICS,
  owned: ['lantern.amber', 'lantern.rose'],
  equipped: { ...defaultEquipped(), lantern_color: 'lantern.rose' },
  attunement: 30,
  level: 1,
};

describe('wardrobeModel', () => {
  it('groups by category and flags owned/equipped/locked', () => {
    const model = wardrobeModel(res);
    const lanterns = model.find((c) => c.category === 'lantern_color')!;
    const amber = lanterns.items.find((i) => i.id === 'lantern.amber')!;
    const rose = lanterns.items.find((i) => i.id === 'lantern.rose')!;
    const jade = lanterns.items.find((i) => i.id === 'lantern.jade')!;

    expect(amber.owned).toBe(true);
    expect(rose.equipped).toBe(true);
    expect(jade.owned).toBe(false);
    expect(jade.unlocksAtMilestone).toBe(2);
    expect(amber.unlocksAtMilestone).toBeNull();
  });

  it('covers every category', () => {
    expect(wardrobeModel(res)).toHaveLength(6);
  });
});

describe('canEquip', () => {
  it('is true only for owned, not-currently-equipped items', () => {
    expect(
      canEquip({ id: 'x', name: 'X', owned: true, equipped: false, unlocksAtMilestone: null }),
    ).toBe(true);
    expect(
      canEquip({ id: 'x', name: 'X', owned: true, equipped: true, unlocksAtMilestone: null }),
    ).toBe(false);
    expect(
      canEquip({ id: 'x', name: 'X', owned: false, equipped: false, unlocksAtMilestone: 2 }),
    ).toBe(false);
  });
});
