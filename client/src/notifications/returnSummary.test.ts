import { describe, it, expect } from 'vitest';
import type { AppreciationSummary } from '@wanderlight/shared';
import { returnSummaryView } from './returnSummary';

describe('returnSummaryView', () => {
  it('shows nothing when there is no news', () => {
    const view = returnSummaryView({ totalNew: 0, traces: [] });
    expect(view.hasNews).toBe(false);
    expect(view.lines).toHaveLength(0);
  });

  it('summarizes multiple thanks with a headline + per-trace lines', () => {
    const summary: AppreciationSummary = {
      totalNew: 4,
      traces: [
        { traceId: 't1', traceType: 'signpost', count: 3 },
        { traceId: 't2', traceType: 'lantern', count: 1 },
      ],
    };
    const view = returnSummaryView(summary);
    expect(view.hasNews).toBe(true);
    expect(view.headline).toBe('Welcome back — 4 travelers thanked your traces');
    expect(view.lines).toEqual([
      '3 travelers thanked your signpost',
      '1 traveler thanked your lantern',
    ]);
  });

  it('uses singular for a single thanks', () => {
    const view = returnSummaryView({
      totalNew: 1,
      traces: [{ traceId: 't1', traceType: 'signpost', count: 1 }],
    });
    expect(view.headline).toBe('Welcome back — a traveler thanked your traces');
  });
});
