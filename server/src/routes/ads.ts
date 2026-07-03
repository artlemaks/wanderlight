/**
 * Rewarded-ad route (P4-CLI-03).
 *
 * `POST /ads/reward` grants a small mote top-up for a *verified, opt-in* ad completion, capped per day.
 * **Guardrail §9:** strictly opt-in (the client only calls this after the player chose to watch), never
 * interstitial, daily-capped, and the reward grants no power. The `verified` flag stands in for the ad
 * network's server-to-server completion callback (wired on activation).
 */

import type { FastifyInstance } from 'fastify';
import {
  REWARDED_AD_REWARD,
  REWARDED_AD_DAILY_CAP,
  adDayBucket,
  type AdRewardResponse,
} from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';

export function registerAdRoutes(app: FastifyInstance, repo: Repository): void {
  app.post<{ Body: { verified?: boolean } }>('/ads/reward', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    // Only grant on a verified completion (ad-network S2S callback stands in as `verified`).
    if (req.body?.verified !== true) {
      return reply
        .status(400)
        .send({ error: 'not_verified', message: 'Ad completion not verified' });
    }
    const now = Date.now();
    const result = await repo.grantAdReward(
      player.id,
      adDayBucket(now),
      REWARDED_AD_DAILY_CAP,
      REWARDED_AD_REWARD,
    );
    const body: AdRewardResponse = {
      granted: result.granted,
      reward: result.granted ? REWARDED_AD_REWARD : null,
      motes: result.player.motes,
      grantsToday: result.grantsToday,
    };
    if (!result.granted) return reply.status(429).send({ ...body, error: 'daily_cap' });
    return body;
  });
}
