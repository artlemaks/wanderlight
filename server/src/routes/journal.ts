/**
 * Journal + mote routes (P2-DATA-02 / P2-CLI-05/06).
 *
 * `GET /journal` returns the caller's personal history feed (newest first). `POST /mote/collect`
 * gathers a mote of light, crediting motes once per mote. Both resolve the anonymous session so a
 * returning device sees its own feed / balance.
 */

import type { FastifyInstance } from 'fastify';
import { WORLD_SEED, type JournalResponse } from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';
import { collectMote, type CollectError } from '../mote/service';

/** Max journal entries returned per request. */
const JOURNAL_PAGE_SIZE = 100;

const COLLECT_STATUS: Record<CollectError['code'], number> = {
  invalid: 400,
  not_found: 404,
};

export function registerJournalRoutes(app: FastifyInstance, repo: Repository): void {
  app.get('/journal', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);
    const events = await repo.getJournal(player.id, JOURNAL_PAGE_SIZE);
    const body: JournalResponse = { events };
    return body;
  });

  app.post<{ Body: { moteId?: string } }>('/mote/collect', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    const result = await collectMote(
      repo,
      WORLD_SEED,
      player.id,
      req.body?.moteId ?? '',
      Date.now(),
    );
    if (!result.ok) {
      return reply
        .status(COLLECT_STATUS[result.error.code])
        .send({ error: result.error.code, message: result.error.message });
    }
    return { applied: result.applied, motes: result.motes };
  });
}
