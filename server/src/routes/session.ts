/**
 * `POST /session` — anonymous session bootstrap endpoint (P1-SRV-02).
 *
 * Returns the caller's player id + mote balance, and echoes the device token in the
 * `x-device-token` response header so a first-time visitor can store it and return as the same
 * player. Fires `session_start` server-side (P0-ANL-01 taxonomy).
 */

import type { FastifyInstance } from 'fastify';
import { analyticsEvent, SEED_VERSION } from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';
import type { AnalyticsClient } from '../observability/analytics';

export function registerSessionRoutes(
  app: FastifyInstance,
  repo: Repository,
  analytics: AnalyticsClient,
): void {
  app.post('/session', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    analytics.capture(player.id, analyticsEvent('session_start', { seedVersion: SEED_VERSION }));
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    return { playerId: player.id, motes: player.motes, deviceToken };
  });
}
