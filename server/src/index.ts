import Fastify from 'fastify';
import { chunkId, loadConfig, SEED_VERSION } from '@wanderlight/shared';
import { createErrorReporter } from './observability/reporter';
import { createAnalyticsClient } from './observability/analytics';

// Thin P0 server: proves `@wanderlight/shared` is importable server-side and gives P1 a skeleton
// to build on. Real routes/data land in P1 (P1-SRV-*). P0-INFRA-06 adds structured JSON logging
// with a request id and a guarded Sentry error path; P0-ANL-01 adds a guarded PostHog client.
const config = loadConfig();

const app = Fastify({
  // pino → JSON logs. Prefer an inbound `x-request-id` (for cross-service tracing) and fall back to
  // Fastify's own generator; the id is attached to every per-request log line as `reqId`.
  logger: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
});

async function main(): Promise<void> {
  const reporter = await createErrorReporter(config.sentryDsn, app.log);
  const analytics = await createAnalyticsClient(config.posthogKey, config.posthogHost, app.log);

  // Route uncaught request errors to structured logs (with reqId) and the error reporter.
  app.setErrorHandler((err, request, reply) => {
    request.log.error({ err }, 'request error');
    reporter.captureException(err, { reqId: request.id, method: request.method, url: request.url });
    const status = err.statusCode ?? 500;
    reply.status(status).send({ error: err.name || 'InternalServerError', reqId: request.id });
  });

  app.get('/health', async () => ({
    status: 'ok',
    seedVersion: SEED_VERSION,
    originChunk: chunkId(0, 0),
  }));

  // Dev-only probe to validate the Sentry path end-to-end (P0-INFRA-06 AC). Never mounted in prod.
  if (process.env.NODE_ENV !== 'production') {
    app.get('/debug/boom', async () => {
      throw new Error('Intentional test error from /debug/boom');
    });
  }

  const port = Number(process.env.PORT ?? 3000);

  // Flush telemetry on shutdown so buffered errors/events aren't lost.
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await Promise.allSettled([reporter.flush(), analytics.shutdown()]);
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));

  const address = await app.listen({ port, host: '0.0.0.0' });
  app.log.info(
    {
      address,
      analyticsConfigured: Boolean(config.posthogKey),
      errorTracking: Boolean(config.sentryDsn),
    },
    'server listening',
  );
}

main().catch((err) => {
  app.log.error(err, 'failed to start server');
  process.exit(1);
});
