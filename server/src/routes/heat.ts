/**
 * `POST /heat` (P2-CLI-02 → P2-SRV-03) — ingest a batch of movement-heat samples.
 *
 * The client sampler batch-sends visited footpath tiles here; the server buffers them for the
 * footpath aggregation job. Validation is defensive (finite integer tiles, bounded batch) since this
 * is a high-frequency, low-trust endpoint. Recording is fire-and-persist — no economy, no response
 * body beyond the accepted count — so it stays cheap.
 */

import type { FastifyInstance } from 'fastify';
import { MAX_HEAT_BATCH, type HeatBatchRequest, type HeatBatchResponse } from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';

/** Keep only well-formed integer tiles; drop the rest rather than 400 the whole batch. */
function sanitizeTiles(
  tiles: HeatBatchRequest['tiles'] | undefined,
): Array<{ tx: number; ty: number }> {
  if (!Array.isArray(tiles)) return [];
  const out: Array<{ tx: number; ty: number }> = [];
  for (const t of tiles) {
    if (out.length >= MAX_HEAT_BATCH) break;
    if (t && Number.isInteger(t.tx) && Number.isInteger(t.ty)) out.push({ tx: t.tx, ty: t.ty });
  }
  return out;
}

export function registerHeatRoutes(app: FastifyInstance, repo: Repository): void {
  app.post<{ Body: HeatBatchRequest }>('/heat', async (req, reply) => {
    const { deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    const tiles = sanitizeTiles(req.body?.tiles);
    if (tiles.length > 0) await repo.recordHeatSamples(tiles);
    const body: HeatBatchResponse = { accepted: tiles.length };
    return reply.status(202).send(body);
  });
}
