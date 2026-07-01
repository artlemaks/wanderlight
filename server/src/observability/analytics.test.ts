import { describe, expect, it, vi } from 'vitest';
import { analyticsEvent } from '@wanderlight/shared';
import { createAnalyticsClient, noopAnalytics } from './analytics';

describe('createAnalyticsClient', () => {
  it('returns the noop client when no key is configured', async () => {
    const client = await createAnalyticsClient(undefined, undefined);
    expect(client).toBe(noopAnalytics);
  });

  it('falls back to noop (with a warning) when posthog-node is not installed', async () => {
    const log = { warn: vi.fn() };
    const client = await createAnalyticsClient('phc_test', 'https://eu.posthog.com', log);
    expect(client).toBe(noopAnalytics);
    expect(log.warn).toHaveBeenCalledOnce();
  });

  it('noop client is inert and its shutdown resolves', async () => {
    const event = analyticsEvent('session_start', { seedVersion: 1 });
    expect(() => noopAnalytics.capture('anon_1', event)).not.toThrow();
    await expect(noopAnalytics.shutdown()).resolves.toBeUndefined();
  });
});
