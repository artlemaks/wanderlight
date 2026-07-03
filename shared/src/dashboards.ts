/**
 * Success dashboards spec + analytics coverage (P6-ANL-01 / P6-ANL-02).
 *
 * The single source of truth for the soft-launch dashboards: each success metric (scope §12) mapped to
 * the canonical analytics event(s) that feed it and its launch target. Kept as pure data in `shared`
 * so the metric↔event wiring is unit-tested — P6-ANL-02's "analytics QA" is, concretely, the assertion
 * that every metric references a real event and **every** instrumented event feeds ≥1 dashboard (no
 * event goes uncharted, no dashboard depends on a phantom event).
 */

import { ANALYTICS_EVENTS, type AnalyticsEventName } from './analytics';

export interface DashboardMetric {
  readonly id: string;
  readonly label: string;
  /** The analytics events this metric is computed from. */
  readonly events: readonly AnalyticsEventName[];
  /** The scope §12 launch target (human-readable). */
  readonly target: string;
}

/** The §12 launch-metric dashboards. Every canonical event is referenced by at least one row. */
export const SUCCESS_DASHBOARDS: readonly DashboardMetric[] = [
  {
    id: 'activation',
    label: 'Activation — placed a trace in session 1',
    events: ['place_trace', 'session_start'],
    target: '> 55%',
  },
  { id: 'discovery', label: 'Discovery volume', events: ['discover_trace'], target: 'benchmark' },
  {
    id: 'prosocial_given',
    label: 'Appreciations given per DAU',
    events: ['appreciate_trace'],
    target: 'healthy pro-social loop',
  },
  {
    id: 'prosocial_received',
    label: '% of traces receiving ≥1 appreciation',
    events: ['receive_appreciation'],
    target: 'pro-social loop',
  },
  {
    id: 'return_rate',
    label: 'Return rate after an appreciation notification',
    events: ['return_post_appreciation'],
    target: 'key retention signal',
  },
  {
    id: 'retention',
    label: 'D1 / D7 / D30 retention',
    events: ['session_start'],
    target: 'D1 > 35%, D7 > 15%',
  },
  {
    id: 'session_length',
    label: 'Sessions/day + session length',
    events: ['session_start'],
    target: 'benchmark',
  },
  {
    id: 'monetization',
    label: 'Payer conversion · ARPDAU · Trail Pass attach',
    events: ['purchase'],
    target: '2–5% payer',
  },
];

/** Which dashboards a given event feeds. */
export function dashboardsForEvent(event: AnalyticsEventName): DashboardMetric[] {
  return SUCCESS_DASHBOARDS.filter((d) => d.events.includes(event));
}

/** Canonical events not referenced by any dashboard — must be empty for analytics QA to pass. */
export function uncoveredEvents(): AnalyticsEventName[] {
  const covered = new Set(SUCCESS_DASHBOARDS.flatMap((d) => d.events));
  return ANALYTICS_EVENTS.filter((e) => !covered.has(e));
}
