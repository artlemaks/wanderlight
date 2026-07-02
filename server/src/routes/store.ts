/**
 * Cosmetic store routes (P4-CLI-02).
 *
 * `GET /store` lists cosmetics (embers) + ember packs (real money) + the caller's balance/owned set.
 * `POST /store/purchase` spends embers on a cosmetic. `POST /store/embers` buys an ember pack.
 * `POST /store/kit` buys the one-time Wayfarer's Kit. **Guardrail §9:** the store sells cosmetics only,
 * every one also free-earnable; embers ≠ power.
 */

import type { FastifyInstance } from 'fastify';
import { STORE_ITEMS, EMBER_PACKS, type StoreResponse } from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import type { PaymentProvider } from '../payments/provider';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';
import { purchaseCosmetic, buyEmbers, buyWayfarersKit, type StoreError } from '../store/service';

const STORE_STATUS: Record<StoreError['code'], number> = {
  invalid: 400,
  insufficient_embers: 402,
  already_owned: 409,
  charge_failed: 402,
  price_band: 400,
};

export function registerStoreRoutes(
  app: FastifyInstance,
  repo: Repository,
  payments: PaymentProvider,
): void {
  app.get('/store', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    const body: StoreResponse = {
      items: STORE_ITEMS,
      packs: EMBER_PACKS,
      embers: player.embers,
      owned: player.cosmeticsOwned,
    };
    return body;
  });

  app.post<{ Body: { cosmeticId?: string } }>('/store/purchase', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    const result = await purchaseCosmetic(repo, player.id, req.body?.cosmeticId ?? '');
    if (!result.ok) {
      return reply
        .status(STORE_STATUS[result.error.code])
        .send({ error: result.error.code, message: result.error.message });
    }
    return { ok: true, cosmeticId: req.body!.cosmeticId, embers: result.value.player.embers };
  });

  app.post<{ Body: { packId?: string } }>('/store/embers', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    const result = await buyEmbers(repo, payments, player.id, req.body?.packId ?? '');
    if (!result.ok) {
      return reply
        .status(STORE_STATUS[result.error.code])
        .send({ error: result.error.code, message: result.error.message });
    }
    return { embers: result.value.embers };
  });

  app.post('/store/kit', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    const result = await buyWayfarersKit(repo, payments, player.id);
    if (!result.ok) {
      return reply
        .status(STORE_STATUS[result.error.code])
        .send({ error: result.error.code, message: result.error.message });
    }
    return { ok: true, giftCharges: result.value.player.giftCharges };
  });
}
