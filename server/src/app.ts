/**
 * Fastify application factory (P1-SRV-01).
 *
 * Builds the app from injected dependencies (repo, corpus, analytics, reporter) so integration tests
 * can drive it with an in-memory repo via `app.inject` — no network, no DB. `index.ts` wires the real
 * dependencies and calls `listen`. Health check, structured logging (reqId), a guarded Sentry error
 * path, and the P1 routes all live here.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { chunkId, SEED_VERSION } from '@wanderlight/shared';
import type { ErrorReporter } from './observability/reporter';
import type { AnalyticsClient } from './observability/analytics';
import type { Repository } from './repo/types';
import type { Corpus } from './content/corpus';
import { registerWorldRoutes } from './routes/world';
import { registerTraceRoutes } from './routes/trace';
import { registerSessionRoutes } from './routes/session';
import { registerShrineRoutes } from './routes/shrine';
import { registerHeatRoutes } from './routes/heat';
import { registerJournalRoutes } from './routes/journal';

export interface AppDeps {
  readonly repo: Repository;
  readonly corpus: Corpus;
  readonly analytics: AnalyticsClient;
  readonly reporter: ErrorReporter;
  /** Fastify logger option — defaults on; pass false to silence in tests. */
  readonly logger?: boolean;
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: deps.logger ?? true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  });

  app.setErrorHandler((err, request, reply) => {
    request.log.error({ err }, 'request error');
    deps.reporter.captureException(err, {
      reqId: request.id,
      method: request.method,
      url: request.url,
    });
    const status = err.statusCode ?? 500;
    reply.status(status).send({ error: err.name || 'InternalServerError', reqId: request.id });
  });

  app.get('/health', async () => ({
    status: 'ok',
    seedVersion: SEED_VERSION,
    originChunk: chunkId(0, 0),
  }));

  if (process.env.NODE_ENV !== 'production') {
    app.get('/debug/boom', async () => {
      throw new Error('Intentional test error from /debug/boom');
    });
  }

  registerSessionRoutes(app, deps.repo, deps.analytics);
  registerWorldRoutes(app, deps.repo);
  registerTraceRoutes(app, deps.repo, deps.corpus, deps.analytics);
  registerShrineRoutes(app, deps.repo);
  registerHeatRoutes(app, deps.repo);
  registerJournalRoutes(app, deps.repo);

  return app;
}
