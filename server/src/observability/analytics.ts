import type { AnalyticsEvent } from '@wanderlight/shared';

/**
 * Server-side analytics (P0-ANL-01) — a thin, guarded seam over posthog-node.
 *
 * Like the error reporter, `posthog-node` is optional: loaded only when `POSTHOG_KEY` is set AND the
 * package is installed; otherwise the app uses {@link noopAnalytics}. Events are typed via the shared
 * {@link AnalyticsEvent} contract so client and server can't drift. Activation:
 *   `npm i posthog-node` + set `POSTHOG_KEY` (and optionally `POSTHOG_HOST`).
 */

export interface AnalyticsClient {
  /** Record a typed event for a distinct id (the anonymous/device id, later the account id). */
  capture(distinctId: string, event: AnalyticsEvent): void;
  /** Flush and close the client before shutdown. */
  shutdown(): Promise<void>;
}

interface WarnLogger {
  warn(obj: unknown, msg?: string): void;
}

/** Does nothing — the default when PostHog is not configured. */
export const noopAnalytics: AnalyticsClient = {
  capture() {},
  async shutdown() {},
};

/**
 * Build an {@link AnalyticsClient}. Returns {@link noopAnalytics} when `key` is falsy or when
 * `posthog-node` cannot be loaded (logging a one-time warning in the latter case).
 */
export async function createAnalyticsClient(
  key: string | undefined,
  host: string | undefined,
  log?: WarnLogger,
): Promise<AnalyticsClient> {
  if (!key) return noopAnalytics;

  try {
    const specifier = 'posthog-node';
    const mod = (await import(specifier)) as {
      PostHog: new (key: string, opts?: { host?: string }) => {
        capture(payload: { distinctId: string; event: string; properties?: Record<string, unknown> }): void;
        shutdown(): Promise<void>;
      };
    };
    const client = new mod.PostHog(key, host ? { host } : undefined);
    return {
      capture(distinctId, event) {
        client.capture({ distinctId, event: event.name, properties: { ...event.properties } });
      },
      async shutdown() {
        await client.shutdown();
      },
    };
  } catch (err) {
    log?.warn(
      { err },
      'POSTHOG_KEY is set but posthog-node is not installed — server analytics disabled (run `npm i posthog-node`)',
    );
    return noopAnalytics;
  }
}
