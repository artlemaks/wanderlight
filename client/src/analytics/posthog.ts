import {
  analyticsEvent,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from '@wanderlight/shared';

/**
 * Client analytics (P0-ANL-01) — a guarded seam over posthog-js.
 *
 * posthog-js is optional: loaded only when `VITE_POSTHOG_KEY` is set AND the package is installed;
 * otherwise every call is a no-op. Activation: `npm i posthog-js` (in `client`) + set
 * `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`. Events are typed through the shared taxonomy so the
 * client can't emit an event the server doesn't know about.
 */

const ANON_ID_KEY = 'wl_anon_id';

/** Minimal shape of the posthog-js client we use — avoids a hard type dependency. */
interface PosthogLike {
  init(key: string, opts: Record<string, unknown>): void;
  identify(distinctId: string): void;
  capture(event: string, properties?: Record<string, unknown>): void;
}

let client: PosthogLike | null = null;

/**
 * A stable anonymous id for this browser, persisted in localStorage — the "anonymous distinct-id
 * tied to (future) device token". Falls back to an ephemeral id if storage is unavailable.
 */
export function anonymousId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const id = `anon_${crypto.randomUUID()}`;
    localStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    return `anon_${crypto.randomUUID()}`;
  }
}

/**
 * Initialize analytics if configured. No-ops when `VITE_POSTHOG_KEY` is unset, and degrades to a
 * no-op (with a console warning) when posthog-js isn't installed. Safe to call once on boot.
 */
export async function initAnalytics(): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return; // unconfigured (dev / no analytics) → stay silent

  try {
    const specifier = 'posthog-js';
    const mod = (await import(specifier)) as { default?: PosthogLike } & Partial<PosthogLike>;
    const posthog = (mod.default ?? mod) as PosthogLike;
    posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.posthog.com',
      person_profiles: 'identified_only',
      autocapture: false,
    });
    posthog.identify(anonymousId());
    client = posthog;
  } catch (err) {
    console.warn(
      '[wanderlight] VITE_POSTHOG_KEY is set but posthog-js is not installed — analytics disabled (run `npm i posthog-js`)',
      err,
    );
  }
}

/**
 * Capture a typed analytics event. No-op until {@link initAnalytics} has successfully configured a
 * client. The compiler enforces that `properties` matches `name`'s contract.
 */
export function capture<E extends AnalyticsEventName>(
  name: E,
  properties: AnalyticsEventProps[E],
): void {
  const event = analyticsEvent(name, properties);
  client?.capture(event.name, { ...event.properties });
}
