import { describe, expect, it } from 'vitest';
import {
  analyticsEvent,
  ANALYTICS_EVENTS,
  isAnalyticsEventName,
  type AnalyticsEventName,
} from './analytics';

describe('ANALYTICS_EVENTS', () => {
  it('is exactly the §5.D taxonomy, in map order', () => {
    expect([...ANALYTICS_EVENTS]).toEqual([
      'session_start',
      'place_trace',
      'discover_trace',
      'appreciate_trace',
      'receive_appreciation',
      'return_post_appreciation',
      'purchase',
    ]);
  });

  it('has no duplicate event names', () => {
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });
});

describe('analyticsEvent', () => {
  it('pairs a name with its properties', () => {
    const event = analyticsEvent('session_start', { seedVersion: 1 });
    expect(event).toEqual({ name: 'session_start', properties: { seedVersion: 1 } });
  });

  it('shapes a purchase event with the full monetization contract', () => {
    const event = analyticsEvent('purchase', {
      sku: 'trail_pass_s1',
      amountMinor: 499,
      currency: 'USD',
    });
    expect(event.name).toBe('purchase');
    expect(event.properties).toEqual({ sku: 'trail_pass_s1', amountMinor: 499, currency: 'USD' });
  });
});

describe('isAnalyticsEventName', () => {
  it('accepts canonical names and rejects unknown ones', () => {
    for (const name of ANALYTICS_EVENTS) {
      expect(isAnalyticsEventName(name)).toBe(true);
    }
    expect(isAnalyticsEventName('logout')).toBe(false);
    expect(isAnalyticsEventName('')).toBe(false);
  });

  it('narrows the type for downstream use', () => {
    const raw = 'place_trace';
    if (isAnalyticsEventName(raw)) {
      const name: AnalyticsEventName = raw; // compiles only if narrowed
      expect(name).toBe('place_trace');
    }
  });
});
