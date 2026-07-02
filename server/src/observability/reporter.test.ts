import { describe, expect, it, vi } from 'vitest';
import { createErrorReporter, noopReporter } from './reporter';

describe('createErrorReporter', () => {
  it('returns the noop reporter when no DSN is configured', async () => {
    const reporter = await createErrorReporter(undefined);
    expect(reporter).toBe(noopReporter);
  });

  it('falls back to noop (with a warning) when @sentry/node is not installed', async () => {
    const log = { warn: vi.fn() };
    // A DSN is set but the optional package isn't installed here → guarded fallback.
    const reporter = await createErrorReporter(
      'https://examplePublicKey@o0.ingest.sentry.io/0',
      log,
    );
    expect(reporter).toBe(noopReporter);
    expect(log.warn).toHaveBeenCalledOnce();
  });

  it('noop reporter is inert and its flush resolves', async () => {
    expect(() => noopReporter.captureException(new Error('x'), { reqId: '1' })).not.toThrow();
    await expect(noopReporter.flush()).resolves.toBeUndefined();
  });
});
