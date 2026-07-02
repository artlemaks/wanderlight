/**
 * Trace reporting route (P4-SRV-09).
 *
 * `POST /trace/:id/report` files a report against a trace, feeding the admin moderation queue. Because
 * signpost text is curated (never free text), the moderation surface is small — but tone/placement
 * issues can still be flagged.
 */

import type { FastifyInstance } from 'fastify';
import { isReportReason } from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';

export function registerReportRoutes(app: FastifyInstance, repo: Repository): void {
  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/trace/:id/report',
    async (req, reply) => {
      const { player, deviceToken } = await resolveSession(repo, req);
      reply.header(DEVICE_TOKEN_HEADER, deviceToken);

      const reason = req.body?.reason;
      if (!isReportReason(reason)) {
        return reply
          .status(400)
          .send({ error: 'invalid_reason', message: 'Unknown report reason' });
      }
      const trace = await repo.getTraceById(req.params.id);
      if (!trace) {
        return reply.status(404).send({ error: 'not_found', message: 'Trace not found' });
      }
      const report = await repo.createReport(req.params.id, player.id, reason, Date.now());
      return reply.status(201).send({ reportId: report.id, status: report.status });
    },
  );
}
