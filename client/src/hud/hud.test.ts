import { describe, it, expect } from 'vitest';
import { canAfford, hudModel } from './hud';
import { TRACE_PLACEMENT_COST } from '@wanderlight/shared';

describe('HUD affordability', () => {
  it('gates signpost/lantern on the mote balance', () => {
    const broke = { motes: TRACE_PLACEMENT_COST.signpost - 1, giftCharges: 0 };
    expect(canAfford(broke, 'signpost')).toBe(false);
    expect(canAfford({ motes: TRACE_PLACEMENT_COST.signpost, giftCharges: 0 }, 'signpost')).toBe(
      true,
    );
  });

  it('gates gifts on gift charges, not motes', () => {
    expect(canAfford({ motes: 0, giftCharges: 1 }, 'gift')).toBe(true);
    expect(canAfford({ motes: 10_000, giftCharges: 0 }, 'gift')).toBe(false);
  });

  it('builds a display model reflecting current balances', () => {
    const model = hudModel({ motes: TRACE_PLACEMENT_COST.lantern, giftCharges: 0 });
    expect(model.motes).toBe(TRACE_PLACEMENT_COST.lantern);
    expect(model.affordable.lantern).toBe(true);
    expect(model.affordable.gift).toBe(false);
  });
});
