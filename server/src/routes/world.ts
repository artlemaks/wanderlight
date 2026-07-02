/**
 * `GET /world/chunks?ids=cx,cy;cx,cy` (P1-SRV-04).
 *
 * Returns the density-capped, prioritized trace list + warmth for each requested chunk. Chunk ids
 * are `cx,cy` pairs separated by `;`. Prioritization/capping lives in the repo (shared
 * `prioritizeTraces`), so this route just parses, delegates, and shapes the response.
 */

import type { FastifyInstance } from 'fastify';
import type { ChunksResponse } from '@wanderlight/shared';
import type { Repository } from '../repo/types';

/** Parse the `ids` query param into chunk coords, ignoring malformed pairs. Deduplicated. */
export function parseChunkIds(ids: string | undefined): Array<{ cx: number; cy: number }> {
  if (!ids) return [];
  const seen = new Set<string>();
  const out: Array<{ cx: number; cy: number }> = [];
  for (const pair of ids.split(';')) {
    const [cxRaw, cyRaw] = pair.split(',');
    const cx = Number(cxRaw);
    const cy = Number(cyRaw);
    if (!Number.isInteger(cx) || !Number.isInteger(cy)) continue;
    const key = `${cx},${cy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ cx, cy });
  }
  return out;
}

/** Cap on chunks per request — bounds fan-out and read latency. */
export const MAX_CHUNKS_PER_REQUEST = 64;

export function registerWorldRoutes(app: FastifyInstance, repo: Repository): void {
  app.get<{ Querystring: { ids?: string } }>('/world/chunks', async (req, reply) => {
    const chunks = parseChunkIds(req.query.ids);
    if (chunks.length === 0) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Provide ids=cx,cy;cx,cy' });
    }
    if (chunks.length > MAX_CHUNKS_PER_REQUEST) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: `At most ${MAX_CHUNKS_PER_REQUEST} chunks per request`,
      });
    }
    const result = await repo.getChunkTraces(chunks, Date.now());
    const body: ChunksResponse = { chunks: result };
    return body;
  });
}
