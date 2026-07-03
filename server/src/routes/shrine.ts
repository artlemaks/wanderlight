/**
 * Shrine routes (P2-SRV-02): `POST /shrine/offering` and `GET /shrine?ids=cx,cy;cx,cy`.
 *
 * Offerings accumulate against the chunk's shared shrine structure; the read exposes each shrine's
 * current state. Business logic lives in the shrine service; these handlers resolve the session,
 * delegate, and shape the response.
 */

import type { FastifyInstance } from 'fastify';
import {
  chunkId,
  type ShrineOfferingRequest,
  type ShrineOfferingResponse,
  type ShrineState,
} from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';
import { makeOffering, type OfferingError } from '../shrine/service';
import { parseChunkIds } from './world';

const OFFERING_STATUS: Record<OfferingError['code'], number> = {
  invalid: 400,
  insufficient_motes: 402,
};

export function registerShrineRoutes(app: FastifyInstance, repo: Repository): void {
  app.post<{ Body: ShrineOfferingRequest }>('/shrine/offering', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    const result = await makeOffering(repo, player.id, req.body?.x, req.body?.y, Date.now());
    if (!result.ok) {
      return reply
        .status(OFFERING_STATUS[result.error.code])
        .send({ error: result.error.code, message: result.error.message });
    }
    const body: ShrineOfferingResponse = { shrine: result.shrine, motes: result.motes };
    return reply.status(201).send(body);
  });

  app.get<{ Querystring: { ids?: string } }>('/shrine', async (req, reply) => {
    const chunks = parseChunkIds(req.query.ids);
    if (chunks.length === 0) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Provide ids=cx,cy;cx,cy' });
    }
    const shrines: ShrineState[] = [];
    for (const { cx, cy } of chunks) {
      const row = await repo.getShrine(cx, cy);
      if (row) {
        shrines.push({ chunkId: chunkId(cx, cy), offerings: row.offerings, warmth: row.warmth });
      }
    }
    return { shrines };
  });
}
