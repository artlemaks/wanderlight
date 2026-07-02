/**
 * Cosmetics routes (P3-CLI-02/03 / P3-SRV-05).
 *
 * `GET /cosmetics` returns the catalog + this player's owned set, equipped slots, and attunement.
 * `POST /cosmetics/equip` equips an owned item into its category slot (server-validated). Wardrobe is
 * pure expression — nothing here grants power (guardrail §9).
 */

import type { FastifyInstance } from 'fastify';
import {
  COSMETICS,
  attunementLevel,
  isCosmeticCategory,
  type CosmeticsResponse,
  type EquipResponse,
} from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';
import { equipCosmetic, type EquipError } from '../cosmetics/service';

const EQUIP_STATUS: Record<EquipError['code'], number> = {
  invalid: 400,
  not_owned: 403,
};

export function registerCosmeticsRoutes(app: FastifyInstance, repo: Repository): void {
  app.get('/cosmetics', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    const body: CosmeticsResponse = {
      catalog: COSMETICS,
      owned: player.cosmeticsOwned,
      equipped: player.equipped,
      attunement: player.attunement,
      level: attunementLevel(player.attunement),
    };
    return body;
  });

  app.post<{ Body: { category?: string; cosmeticId?: string } }>(
    '/cosmetics/equip',
    async (req, reply) => {
      const { player, deviceToken } = await resolveSession(repo, req);
      reply.header(DEVICE_TOKEN_HEADER, deviceToken);

      const { category, cosmeticId } = req.body ?? {};
      if (!isCosmeticCategory(category) || typeof cosmeticId !== 'string') {
        return reply
          .status(400)
          .send({ error: 'invalid', message: 'category and cosmeticId are required' });
      }
      const result = await equipCosmetic(repo, player.id, category, cosmeticId);
      if (!result.ok) {
        return reply
          .status(EQUIP_STATUS[result.error.code])
          .send({ error: result.error.code, message: result.error.message });
      }
      const body: EquipResponse = { equipped: result.player.equipped };
      return body;
    },
  );
}
