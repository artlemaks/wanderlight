import { describe, it, expect } from 'vitest';
import { summarizeAppreciations, appreciationLine, type AppreciationNotice } from './notifications';

function notice(over: Partial<AppreciationNotice>): AppreciationNotice {
  return {
    id: 'n',
    authorId: 'a',
    traceId: 't1',
    traceType: 'signpost',
    createdAt: 1,
    seen: false,
    ...over,
  };
}

describe('summarizeAppreciations', () => {
  it('counts total and groups by trace', () => {
    const s = summarizeAppreciations([
      notice({ id: '1', traceId: 't1' }),
      notice({ id: '2', traceId: 't1' }),
      notice({ id: '3', traceId: 't2', traceType: 'lantern' }),
    ]);
    expect(s.totalNew).toBe(3);
    expect(s.traces).toHaveLength(2);
    expect(s.traces[0]).toMatchObject({ traceId: 't1', count: 2 });
  });

  it('orders by count desc then recency', () => {
    const s = summarizeAppreciations([
      notice({ id: '1', traceId: 't1', createdAt: 1 }),
      notice({ id: '2', traceId: 't2', createdAt: 5 }),
    ]);
    // Tie on count(1); most-recent trace first.
    expect(s.traces[0]!.traceId).toBe('t2');
  });

  it('empty in → empty summary', () => {
    expect(summarizeAppreciations([])).toEqual({ totalNew: 0, traces: [] });
  });
});

describe('appreciationLine', () => {
  it('pluralizes travelers', () => {
    expect(appreciationLine({ traceId: 't', traceType: 'signpost', count: 1 })).toBe(
      '1 traveler thanked your signpost',
    );
    expect(appreciationLine({ traceId: 't', traceType: 'lantern', count: 3 })).toBe(
      '3 travelers thanked your lantern',
    );
  });
});
