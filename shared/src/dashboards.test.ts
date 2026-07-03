import { describe, it, expect } from 'vitest';
import { ANALYTICS_EVENTS, isAnalyticsEventName } from './analytics';
import { SUCCESS_DASHBOARDS, dashboardsForEvent, uncoveredEvents } from './dashboards';

describe('success dashboards (P6-ANL-01/02 analytics QA)', () => {
  it('every dashboard references only real, canonical events', () => {
    for (const d of SUCCESS_DASHBOARDS) {
      expect(d.events.length).toBeGreaterThan(0);
      for (const e of d.events) expect(isAnalyticsEventName(e)).toBe(true);
    }
  });

  it('every instrumented event feeds at least one dashboard (no uncharted event)', () => {
    expect(uncoveredEvents()).toEqual([]);
  });

  it('maps events back to their dashboards', () => {
    expect(dashboardsForEvent('purchase').map((d) => d.id)).toContain('monetization');
    for (const e of ANALYTICS_EVENTS) {
      expect(dashboardsForEvent(e).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('the activation metric carries the §12 target', () => {
    const activation = SUCCESS_DASHBOARDS.find((d) => d.id === 'activation');
    expect(activation?.target).toContain('55');
  });
});
