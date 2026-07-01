import Fastify from 'fastify';
import { chunkId, loadConfig, SEED_VERSION } from '@wanderlight/shared';

// Thin P0 server: proves `@wanderlight/shared` is importable server-side and gives P1 a skeleton
// to build on. Real routes/data land in P1 (P1-SRV-*).
const config = loadConfig();
const app = Fastify({ logger: true });

app.get('/health', async () => ({
  status: 'ok',
  seedVersion: SEED_VERSION,
  originChunk: chunkId(0, 0),
}));

const port = Number(process.env.PORT ?? 3000);

app
  .listen({ port, host: '0.0.0.0' })
  .then((address) => {
    app.log.info({ address, analyticsConfigured: Boolean(config.posthogKey) }, 'server listening');
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
