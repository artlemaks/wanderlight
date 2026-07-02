/**
 * Appreciation notifications route (P3-SRV-04 / P3-CLI-01).
 *
 * `GET /notifications` returns the return summary — how many strangers thanked the caller's traces
 * since they were last here — then marks those notices seen so the next visit starts fresh. This is
 * the highest-leverage retention surface (scope §12): "3 travelers thanked your signpost."
 */

import type { FastifyInstance } from 'fastify';
import { summarizeAppreciations, type AppreciationSummary } from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';

export function registerNotificationRoutes(app: FastifyInstance, repo: Repository): void {
  app.get('/notifications', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    const unseen = await repo.getAppreciationNotices(player.id, true);
    const body: AppreciationSummary = summarizeAppreciations(unseen);
    // Once summarized on return, clear them so we only ever show "since last visit".
    if (unseen.length > 0) await repo.markAppreciationNoticesSeen(player.id);
    return body;
  });
}
