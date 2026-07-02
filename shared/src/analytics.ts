/**
 * Canonical analytics event taxonomy + property contract (P0-ANL-02).
 *
 * This is the single source of truth for event names and their properties, shared by the client
 * (posthog-js) and server (posthog-node) so both agree on the wire shape. Names mirror the §5.D
 * instrumentation map in `docs/MVP_Task_Breakdown.md`. Framework-agnostic and pure — no PostHog,
 * DOM, or Node types here — so it lives in `@wanderlight/shared`.
 *
 * The event *names* are locked in P0. The per-event property contracts are the P0 draft; later ANL
 * tasks (P1-ANL-01 activation, P2-ANL-01 retention, P4-ANL-01 monetization) refine/extend them as
 * the real payloads land. Extending a contract is additive; renaming an event is a breaking change.
 */

/** The canonical event names, in §5.D map order (session → trace loop → return → purchase). */
export const ANALYTICS_EVENTS = [
  'session_start',
  'place_trace',
  'discover_trace',
  'appreciate_trace',
  'receive_appreciation',
  'return_post_appreciation',
  'purchase',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

/**
 * Property contract per event. Keep required props minimal and meaningful; PostHog attaches the
 * distinct-id itself, so it is not repeated here.
 */
export interface AnalyticsEventProps {
  /** A session began (browser tab opened). Feeds sessions/day + session length. */
  session_start: { readonly seedVersion: number };
  /** Traveler left a trace (P1). Feeds activation (% placing a trace in session 1). */
  place_trace: { readonly chunkId: string; readonly traceId: string };
  /** Traveler discovered someone else's trace (P1). Feeds discovery volume. */
  discover_trace: { readonly chunkId: string; readonly traceId: string };
  /** Traveler appreciated a discovered trace (P1/P2). Feeds appreciations given per DAU. */
  appreciate_trace: { readonly traceId: string };
  /** A trace's author received an appreciation (P2). Feeds % of traces with ≥1 appreciation. */
  receive_appreciation: { readonly traceId: string };
  /** Author returned after being notified of an appreciation (P3). Feeds return rate. */
  return_post_appreciation: { readonly traceId: string };
  /** A purchase completed (P4). Feeds payer conversion, ARPDAU, Trail Pass attach. */
  purchase: { readonly sku: string; readonly amountMinor: number; readonly currency: string };
}

/** A fully-typed analytics event: a name paired with exactly that name's property contract. */
export interface AnalyticsEvent<E extends AnalyticsEventName = AnalyticsEventName> {
  readonly name: E;
  readonly properties: AnalyticsEventProps[E];
}

/**
 * Build a typed analytics event. The compiler enforces that `properties` matches `name`'s contract,
 * so a mistyped event name or a wrong/missing property is a build error at every call site.
 */
export function analyticsEvent<E extends AnalyticsEventName>(
  name: E,
  properties: AnalyticsEventProps[E],
): AnalyticsEvent<E> {
  return { name, properties };
}

/** Type guard: is `value` one of the canonical event names? */
export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENTS as readonly string[]).includes(value);
}
