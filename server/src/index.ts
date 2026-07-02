import { loadConfig } from '@wanderlight/shared';
import { createErrorReporter } from './observability/reporter';
import { createAnalyticsClient } from './observability/analytics';
import { createRepository } from './repo/factory';
import { loadCorpus } from './content/corpus';
import { buildApp } from './app';

// P1 server entrypoint: wires real dependencies (datastore, content corpus, guarded telemetry) into
// the app factory and starts listening. The datastore is in-memory unless DATABASE_URL is set
// (see repo/factory) — matching the guarded-integration pattern used for Sentry/PostHog.
const config = loadConfig();

async function main(): Promise<void> {
  const reporter = await createErrorReporter(config.sentryDsn, console);
  const analytics = await createAnalyticsClient(config.posthogKey, config.posthogHost, console);
  const repo = await createRepository(config.databaseUrl, console);
  const corpus = await loadCorpus();

  const app = buildApp({ repo, corpus, analytics, reporter });
  const port = Number(process.env.PORT ?? 3000);

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await Promise.allSettled([reporter.flush(), analytics.shutdown(), repo.close()]);
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
      datastore: config.databaseUrl ? 'postgres' : 'memory',
    },
    'server listening',
  );
}

main().catch((err) => {
  console.error('failed to start server', err);
  process.exit(1);
});
