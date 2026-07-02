import { describe, it, expect } from 'vitest';
import { COSMETICS } from './cosmetics';
import {
  STORE_ITEMS,
  EMBER_PACKS,
  PRICE_BAND_USD_CENTS,
  PREMIUM_PASS,
  WAYFARERS_KIT,
  isStoreItemFreeEarnable,
  storeItem,
  emberPack,
} from './store';

const catalogIds = new Set(COSMETICS.map((c) => c.id));

describe('store guardrails (§9)', () => {
  it('every store item is a real, free-earnable catalog cosmetic', () => {
    for (const item of STORE_ITEMS) {
      expect(catalogIds.has(item.cosmeticId)).toBe(true);
      expect(isStoreItemFreeEarnable(item)).toBe(true);
      expect(item.priceEmbers).toBeGreaterThan(0);
    }
  });

  it('every real-money price sits inside the $1.99–$6.99 band', () => {
    for (const pack of EMBER_PACKS) {
      expect(pack.priceUsdCents).toBeGreaterThanOrEqual(PRICE_BAND_USD_CENTS.min);
      expect(pack.priceUsdCents).toBeLessThanOrEqual(PRICE_BAND_USD_CENTS.max);
    }
    for (const price of [PREMIUM_PASS.priceUsdCents, WAYFARERS_KIT.priceUsdCents]) {
      expect(price).toBeGreaterThanOrEqual(PRICE_BAND_USD_CENTS.min);
      expect(price).toBeLessThanOrEqual(PRICE_BAND_USD_CENTS.max);
    }
  });

  it("the Wayfarer's Kit cosmetic is also free-earnable", () => {
    expect(catalogIds.has(WAYFARERS_KIT.cosmeticId)).toBe(true);
  });

  it('lookups resolve real ids and reject unknowns', () => {
    expect(storeItem('cloak.mist')).toBeDefined();
    expect(storeItem('nope')).toBeUndefined();
    expect(emberPack('embers.small')).toBeDefined();
    expect(emberPack('nope')).toBeUndefined();
  });
});
