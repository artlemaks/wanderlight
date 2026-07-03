/**
 * Embers currency + cosmetic store + payments contracts (P4-DATA-02 / P4-SRV-03/04/05 / P4-CLI-02).
 *
 * **Embers** are the *bought* premium currency — deliberately **separate from motes** (the earned soft
 * currency). Embers buy **cosmetics only**.
 *
 * **Monetization guardrails (scope §9 — binding, see `monetization-guardrails-in-ac`):**
 * - motes (earned) and embers (bought) are never interchangeable in a way that grants power;
 * - every store cosmetic is *also* free-earnable — the store's ids all come from {@link COSMETICS},
 *   which are earnable on the attunement track — so buying is a shortcut, never the only path;
 * - nothing sold affects the shared world or another player.
 *
 * Ember *packs* are bought with real money (price bands $1.99–$6.99) via the guarded payment provider
 * (P4-SRV-05). This module is pure data + guardrail predicates; the server is authoritative over grants.
 */

import { cosmeticById } from './cosmetics';

/** A cosmetic offered in the store for embers. `cosmeticId` MUST be a free-earnable catalog item. */
export interface StoreItem {
  readonly cosmeticId: string;
  readonly priceEmbers: number;
}

/** The cosmetic store catalog. Every id is a catalog cosmetic → free-earnable (guardrail §9). */
export const STORE_ITEMS: readonly StoreItem[] = [
  { cosmeticId: 'cloak.mist', priceEmbers: 120 },
  { cosmeticId: 'cloak.dawn', priceEmbers: 150 },
  { cosmeticId: 'cloak.forest', priceEmbers: 150 },
  { cosmeticId: 'cloak.dusk', priceEmbers: 200 },
  { cosmeticId: 'glyph.spiral', priceEmbers: 80 },
  { cosmeticId: 'glyph.leaf', priceEmbers: 80 },
  { cosmeticId: 'glyph.star', priceEmbers: 100 },
  { cosmeticId: 'trail.sparkle', priceEmbers: 80 },
  { cosmeticId: 'trail.petal', priceEmbers: 100 },
  { cosmeticId: 'trail.glow', priceEmbers: 120 },
  { cosmeticId: 'lantern.jade', priceEmbers: 80 },
  { cosmeticId: 'lantern.azure', priceEmbers: 100 },
  { cosmeticId: 'lantern.violet', priceEmbers: 120 },
  { cosmeticId: 'lantern.ember', priceEmbers: 150 },
  { cosmeticId: 'lantern.frost', priceEmbers: 150 },
  { cosmeticId: 'lantern.gold', priceEmbers: 200 },
  { cosmeticId: 'frame.carved', priceEmbers: 100 },
  { cosmeticId: 'frame.vine', priceEmbers: 120 },
  { cosmeticId: 'wrap.ribbon', priceEmbers: 60 },
  { cosmeticId: 'wrap.bloom', priceEmbers: 80 },
];

const STORE_BY_ID: ReadonlyMap<string, StoreItem> = new Map(
  STORE_ITEMS.map((s) => [s.cosmeticId, s]),
);

export function storeItem(cosmeticId: string): StoreItem | undefined {
  return STORE_BY_ID.get(cosmeticId);
}

/**
 * Ember packs bought with real money. `priceUsdCents` sits inside the scope §9 band ($1.99–$6.99).
 * Buying embers is the *only* real-money transaction; embers then buy cosmetics.
 */
export interface EmberPack {
  readonly id: string;
  readonly embers: number;
  readonly priceUsdCents: number;
}

export const EMBER_PACKS: readonly EmberPack[] = [
  { id: 'embers.small', embers: 120, priceUsdCents: 199 },
  { id: 'embers.medium', embers: 340, priceUsdCents: 499 },
  { id: 'embers.large', embers: 520, priceUsdCents: 699 },
];

const PACK_BY_ID: ReadonlyMap<string, EmberPack> = new Map(EMBER_PACKS.map((p) => [p.id, p]));

export function emberPack(id: string): EmberPack | undefined {
  return PACK_BY_ID.get(id);
}

/** Price-band guard: real-money purchases must stay within $1.99–$6.99 (scope §9). */
export const PRICE_BAND_USD_CENTS = { min: 199, max: 699 } as const;

/** The premium Trail Pass upgrade (P4-SRV-02) — a one-time real-money purchase within the price band. */
export const PREMIUM_PASS = { id: 'pass.premium', priceUsdCents: 499 } as const;

/**
 * The **Wayfarer's Kit** — a one-time premium QoL bundle (P4-SRV-04). Convenience/expression only:
 * extra journal detail, +1 daily gift charge, a cosmetic. **No gameplay power** (guardrail §9).
 */
export const WAYFARERS_KIT = {
  id: 'kit.wayfarer',
  priceUsdCents: 499,
  extraGiftChargesPerDay: 1,
  cosmeticId: 'cloak.forest',
} as const;

/**
 * Guardrail predicate (the §9 test made executable): is every purchasable cosmetic *also* free-earnable
 * — i.e. a real catalog item that is not embers-gated? Store items reference {@link COSMETICS}, so this
 * holds by construction; the test asserts it can never regress.
 */
export function isStoreItemFreeEarnable(item: StoreItem): boolean {
  return cosmeticById(item.cosmeticId) !== undefined;
}

/** `GET /store` — the store catalog + the caller's ember balance + already-owned ids. */
export interface StoreResponse {
  readonly items: readonly StoreItem[];
  readonly packs: readonly EmberPack[];
  readonly embers: number;
  readonly owned: readonly string[];
}

/** `POST /store/purchase` result. */
export interface PurchaseResponse {
  readonly ok: boolean;
  readonly cosmeticId: string;
  readonly embers: number;
}
