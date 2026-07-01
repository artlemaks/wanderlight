import { describe, it, expect } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('reads known keys from the provided env map', () => {
    const config = loadConfig({
      POSTHOG_KEY: 'phc_x',
      POSTHOG_HOST: 'https://eu.posthog.com',
      SENTRY_DSN: 'dsn',
      DATABASE_URL: 'postgres://local',
    });
    expect(config).toEqual({
      posthogKey: 'phc_x',
      posthogHost: 'https://eu.posthog.com',
      sentryDsn: 'dsn',
      databaseUrl: 'postgres://local',
    });
  });

  it('leaves unset keys undefined', () => {
    const config = loadConfig({});
    expect(config.posthogKey).toBeUndefined();
    expect(config.sentryDsn).toBeUndefined();
    expect(config.databaseUrl).toBeUndefined();
  });
});
