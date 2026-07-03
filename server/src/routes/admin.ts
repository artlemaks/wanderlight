/**
 * Admin / moderation routes (P4-OPS-01) — authz-gated.
 *
 * Every `/admin/*` route requires the `x-admin-token` header to match the configured `ADMIN_TOKEN`.
 * When no token is configured the routes are **not registered at all** (fail-closed) so a misconfigured
 * deploy can never expose an open admin surface. Lets a moderator triage the report queue, remove/fade
 * traces, and resolve reports.
 */

import type { FastifyInstance } from 'fastify';
import type { Repository } from '../repo/types';

/** Max reports returned to the admin queue per request. */
const QUEUE_PAGE_SIZE = 50;

export function registerAdminRoutes(
  app: FastifyInstance,
  repo: Repository,
  adminToken: string | undefined,
): void {
  // Fail closed: with no admin token configured, the admin surface does not exist.
  if (!adminToken) return;

  app.addHook('preHandler', async (req, reply) => {
    if (!req.url.startsWith('/admin')) return;
    const provided = req.headers['x-admin-token'];
    const token = Array.isArray(provided) ? provided[0] : provided;
    if (token !== adminToken) {
      return reply.status(401).send({ error: 'unauthorized' });
    }
  });

  app.get('/admin/reports', async () => {
    const reports = await repo.getOpenReports(QUEUE_PAGE_SIZE);
    return { reports };
  });

  app.post<{ Params: { id: string }; Body: { action?: string } }>(
    '/admin/reports/:id/resolve',
    async (req, reply) => {
      const action = req.body?.action;
      if (action !== 'remove' && action !== 'dismiss') {
        return reply.status(400).send({ error: 'invalid_action' });
      }
      const result = await repo.resolveReport(req.params.id, action);
      if (!result) return reply.status(404).send({ error: 'not_found' });
      return { status: result.report.status, removedTrace: result.removedTrace };
    },
  );

  app.post<{ Params: { id: string } }>('/admin/trace/:id/remove', async (req, reply) => {
    const removed = await repo.removeTrace(req.params.id);
    if (!removed) return reply.status(404).send({ error: 'not_found' });
    return { removed: true };
  });
}
