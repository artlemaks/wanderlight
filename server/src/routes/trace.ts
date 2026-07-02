/**
 * Trace write routes: `POST /trace` (P1-SRV-05/06) and `POST /trace/:id/appreciate` (P1-SRV-07).
 *
 * Both resolve the caller's anonymous session, delegate to the trace service (which owns validation,
 * economy, and rate limits), and map the discriminated result to HTTP status codes. `place_trace`
 * fires server-side for the activation funnel (P1-ANL-01); `appreciate_trace` fires on first apply.
 */

import type { FastifyInstance } from 'fastify';
import {
  analyticsEvent,
  chunkId,
  worldToChunk,
  type PlaceTraceRequest,
  type PlaceTraceResponse,
  type AppreciateResponse,
  type ClaimGiftResponse,
  type LightLanternResponse,
} from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import type { Corpus } from '../content/corpus';
import type { AnalyticsClient } from '../observability/analytics';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';
import {
  appreciateTrace,
  claimGift,
  lightLantern,
  placeTrace,
  type PlaceError,
} from '../trace/service';

/** HTTP status for each service failure code. */
const PLACE_STATUS: Record<PlaceError['code'], number> = {
  invalid: 400,
  insufficient_motes: 402,
  insufficient_charges: 402,
  rate_limited: 429,
};

export function registerTraceRoutes(
  app: FastifyInstance,
  repo: Repository,
  corpus: Corpus,
  analytics: AnalyticsClient,
): void {
  app.post<{ Body: PlaceTraceRequest }>('/trace', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    const result = await placeTrace(repo, corpus, player.id, req.body, Date.now());
    if (!result.ok) {
      return reply
        .status(PLACE_STATUS[result.error.code])
        .send({ error: result.error.code, message: result.error.message });
    }

    const { cx, cy } = worldToChunk(result.trace.x, result.trace.y);
    analytics.capture(
      player.id,
      analyticsEvent('place_trace', { chunkId: chunkId(cx, cy), traceId: result.trace.id }),
    );
    const body: PlaceTraceResponse = { trace: result.trace, motes: result.motes };
    return reply.status(201).send(body);
  });

  app.post<{ Params: { id: string } }>('/trace/:id/appreciate', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    const result = await appreciateTrace(repo, player.id, req.params.id, Date.now());
    if (!result.ok) {
      const status = result.error.code === 'not_found' ? 404 : 400;
      return reply.status(status).send({ error: result.error.code, message: result.error.message });
    }
    if (result.applied) {
      analytics.capture(player.id, analyticsEvent('appreciate_trace', { traceId: result.traceId }));
    }
    const body: AppreciateResponse = {
      traceId: result.traceId,
      appreciations: result.appreciations,
      applied: result.applied,
    };
    return body;
  });

  // Claim a gift (P2-SRV-01): first finder wins, author gets a silent thanks.
  app.post<{ Params: { id: string } }>('/trace/:id/claim', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    const result = await claimGift(repo, player.id, req.params.id, Date.now());
    if (!result.ok) {
      const status = result.error.code === 'not_found' ? 404 : 400;
      return reply.status(status).send({ error: result.error.code, message: result.error.message });
    }
    const body: ClaimGiftResponse = {
      traceId: result.traceId,
      applied: result.applied,
      motes: result.motes,
    };
    return body;
  });

  // Light a lantern (P2-DATA-01): idempotent per player, raises chunk warmth.
  app.post<{ Params: { id: string } }>('/trace/:id/light', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    const result = await lightLantern(repo, player.id, req.params.id, Date.now());
    if (!result.ok) {
      const status = result.error.code === 'not_found' ? 404 : 400;
      return reply.status(status).send({ error: result.error.code, message: result.error.message });
    }
    const body: LightLanternResponse = {
      traceId: result.traceId,
      litCount: result.litCount,
      applied: result.applied,
    };
    return body;
  });
}
