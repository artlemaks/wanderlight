/**
 * Store + payments service (P4-SRV-03/04/05).
 *
 * Two money paths, both guardrail-safe (scope §9):
 * 1. **Buy embers** with real money → the guarded payment provider charges, we record the purchase for
 *    reconciliation, then credit embers. Real money only ever buys embers (or the one-time kit).
 * 2. **Spend embers** on a cosmetic → server debits embers + grants the cosmetic. Every store cosmetic
 *    is also free-earnable (its id is a catalog item), so buying is a shortcut, never the only path.
 *
 * The Wayfarer's Kit is a one-time QoL bundle (convenience/expression, no power).
 */

import {
  storeItem,
  emberPack,
  isStoreItemFreeEarnable,
  WAYFARERS_KIT,
  PREMIUM_PASS,
  PRICE_BAND_USD_CENTS,
} from '@wanderlight/shared';
import type { GrantResult, Player, Repository } from '../repo/types';
import type { PaymentProvider } from '../payments/provider';

export interface StoreError {
  readonly code:
    'invalid' | 'insufficient_embers' | 'already_owned' | 'charge_failed' | 'price_band';
  readonly message: string;
}

export type StoreResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: StoreError };

/** Spend embers on a store cosmetic. */
export async function purchaseCosmetic(
  repo: Repository,
  playerId: string,
  cosmeticId: string,
): Promise<StoreResult<GrantResult>> {
  const item = storeItem(cosmeticId);
  if (!item) return { ok: false, error: { code: 'invalid', message: 'Not a store item' } };
  // Guardrail assertion (defensive): never sell an item that isn't also free-earnable.
  if (!isStoreItemFreeEarnable(item)) {
    return {
      ok: false,
      error: { code: 'invalid', message: 'Item is not free-earnable (guardrail §9)' },
    };
  }
  const player = await repo.getPlayerById(playerId);
  if (!player) return { ok: false, error: { code: 'invalid', message: 'Unknown player' } };
  if (player.cosmeticsOwned.includes(cosmeticId)) {
    return { ok: false, error: { code: 'already_owned', message: 'Already owned' } };
  }
  if (player.embers < item.priceEmbers) {
    return { ok: false, error: { code: 'insufficient_embers', message: 'Not enough embers' } };
  }
  const grant = await repo.purchaseCosmetic(playerId, cosmeticId, item.priceEmbers);
  if (!grant.applied) {
    return { ok: false, error: { code: 'insufficient_embers', message: 'Purchase not applied' } };
  }
  return { ok: true, value: grant };
}

/** Buy an ember pack with real money via the payment provider, then credit the embers. */
export async function buyEmbers(
  repo: Repository,
  payments: PaymentProvider,
  playerId: string,
  packId: string,
): Promise<StoreResult<Player>> {
  const pack = emberPack(packId);
  if (!pack) return { ok: false, error: { code: 'invalid', message: 'Unknown ember pack' } };
  if (
    pack.priceUsdCents < PRICE_BAND_USD_CENTS.min ||
    pack.priceUsdCents > PRICE_BAND_USD_CENTS.max
  ) {
    return {
      ok: false,
      error: { code: 'price_band', message: 'Price outside the $1.99–$6.99 band' },
    };
  }
  const charge = await payments.charge({
    playerId,
    sku: pack.id,
    amountUsdCents: pack.priceUsdCents,
  });
  if (!charge.ok) return { ok: false, error: { code: 'charge_failed', message: 'Charge failed' } };
  await repo.recordPurchase(playerId, charge.providerRef, pack.id, charge.amountUsdCents);
  const player = await repo.grantEmbers(playerId, pack.embers);
  return { ok: true, value: player };
}

/** Buy the premium Trail Pass upgrade with real money, then flip the player to the premium tier. */
export async function buyPremiumPass(
  repo: Repository,
  payments: PaymentProvider,
  playerId: string,
): Promise<StoreResult<Player>> {
  const charge = await payments.charge({
    playerId,
    sku: PREMIUM_PASS.id,
    amountUsdCents: PREMIUM_PASS.priceUsdCents,
  });
  if (!charge.ok) return { ok: false, error: { code: 'charge_failed', message: 'Charge failed' } };
  await repo.recordPurchase(playerId, charge.providerRef, PREMIUM_PASS.id, charge.amountUsdCents);
  const player = await repo.upgradePassTier(playerId);
  return { ok: true, value: player };
}

/** Buy the one-time Wayfarer's Kit (QoL bundle). */
export async function buyWayfarersKit(
  repo: Repository,
  payments: PaymentProvider,
  playerId: string,
): Promise<StoreResult<GrantResult>> {
  const charge = await payments.charge({
    playerId,
    sku: WAYFARERS_KIT.id,
    amountUsdCents: WAYFARERS_KIT.priceUsdCents,
  });
  if (!charge.ok) return { ok: false, error: { code: 'charge_failed', message: 'Charge failed' } };
  await repo.recordPurchase(playerId, charge.providerRef, WAYFARERS_KIT.id, charge.amountUsdCents);
  const grant = await repo.grantWayfarersKit(
    playerId,
    WAYFARERS_KIT.cosmeticId,
    WAYFARERS_KIT.extraGiftChargesPerDay,
  );
  if (!grant.applied) {
    return { ok: false, error: { code: 'already_owned', message: 'Kit already owned' } };
  }
  return { ok: true, value: grant };
}
