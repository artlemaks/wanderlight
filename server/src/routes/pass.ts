/**
 * Season + Trail Pass routes (P4-CLI-01).
 *
 * `GET /pass` returns the season, both reward tracks, and the caller's progress. `POST /pass/upgrade`
 * buys the premium tier (real money via the guarded provider). `POST /pass/claim` claims a reward on a
 * lane+tier (server-validated). **Guardrail §9:** rewards are cosmetic/boost only; free lane is always
 * reachable by play.
 */

import type { FastifyInstance } from 'fastify';
import {
  WAKING_VALE_SEASON,
  PASS_TRACKS,
  seasonTierForXp,
  type PassLane,
} from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import type { PaymentProvider } from '../payments/provider';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';
import { claimPassReward, type ClaimError } from '../pass/service';
import { buyPremiumPass } from '../store/service';

const CLAIM_STATUS: Record<ClaimError['code'], number> = {
  not_reached: 400,
  locked: 403,
  no_reward: 404,
  already_claimed: 409,
};

export function registerPassRoutes(
  app: FastifyInstance,
  repo: Repository,
  payments: PaymentProvider,
): void {
  app.get('/pass', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    return {
      season: WAKING_VALE_SEASON,
      tracks: PASS_TRACKS,
      progress: {
        xp: player.seasonXp,
        tier: seasonTierForXp(player.seasonXp),
        passTier: player.passTier,
        claimed: player.passClaimed,
      },
    };
  });

  app.post('/pass/upgrade', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    const result = await buyPremiumPass(repo, payments, player.id);
    if (!result.ok) {
      return reply.status(402).send({ error: result.error.code, message: result.error.message });
    }
    return { passTier: result.value.passTier };
  });

  app.post<{ Body: { lane?: string; tier?: number } }>('/pass/claim', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    const lane = req.body?.lane;
    const tier = req.body?.tier;
    if ((lane !== 'free' && lane !== 'premium') || typeof tier !== 'number') {
      return reply.status(400).send({ error: 'invalid', message: 'lane and tier are required' });
    }
    const result = await claimPassReward(repo, player.id, lane as PassLane, tier);
    if (!result.ok) {
      return reply
        .status(CLAIM_STATUS[result.error.code])
        .send({ error: result.error.code, message: result.error.message });
    }
    return {
      claimed: true,
      motes: result.grant.player.motes,
      owned: result.grant.player.cosmeticsOwned,
    };
  });
}
