import { describe, it, expect } from 'vitest';
import {
  isTraceType,
  tracePriority,
  prioritizeTraces,
  MAX_TRACES_PER_CHUNK,
  PRIORITY_WEIGHTS,
  type Trace,
} from './traces';

const NOW = 1_700_000_000_000;

/** Build a Trace with sensible defaults; override only what a test cares about. */
function makeTrace(over: Partial<Trace> = {}): Trace {
  return {
    id: over.id ?? 't1',
    type: over.type ?? 'signpost',
    chunkX: over.chunkX ?? 0,
    chunkY: over.chunkY ?? 0,
    x: over.x ?? 1,
    y: over.y ?? 1,
    authorId: over.authorId ?? 'a1',
    payload: over.payload ?? { templateId: 'encourage-01', slots: {} },
    warmth: over.warmth ?? 0,
    appreciations: over.appreciations ?? 0,
    createdAt: over.createdAt ?? NOW,
    expiresAt: over.expiresAt ?? null,
  };
}

describe('isTraceType', () => {
  it('accepts the known trace types', () => {
    expect(isTraceType('signpost')).toBe(true);
    expect(isTraceType('lantern')).toBe(true);
  });

  it('rejects unknown values and non-strings', () => {
    expect(isTraceType('gift')).toBe(false);
    expect(isTraceType(3)).toBe(false);
    expect(isTraceType(undefined)).toBe(false);
  });
});

describe('tracePriority', () => {
  it('gives a brand-new, un-appreciated trace a freshness of ~1', () => {
    expect(tracePriority(makeTrace({ createdAt: NOW }), NOW)).toBeCloseTo(1, 5);
  });

  it('decays to half after one freshness half-life', () => {
    const old = makeTrace({ createdAt: NOW - PRIORITY_WEIGHTS.freshnessHalfLifeMs });
    expect(tracePriority(old, NOW)).toBeCloseTo(0.5, 5);
  });

  it('rewards appreciations and warmth additively', () => {
    const base = tracePriority(makeTrace({ createdAt: NOW }), NOW);
    const appreciated = tracePriority(makeTrace({ createdAt: NOW, appreciations: 2 }), NOW);
    expect(appreciated - base).toBeCloseTo(PRIORITY_WEIGHTS.appreciation * 2, 5);
  });

  it('never treats a future createdAt as negative age', () => {
    const future = makeTrace({ createdAt: NOW + 10_000 });
    expect(tracePriority(future, NOW)).toBeCloseTo(1, 5);
  });
});

describe('prioritizeTraces', () => {
  it('orders by descending priority', () => {
    const fresh = makeTrace({ id: 'fresh', createdAt: NOW });
    const stale = makeTrace({ id: 'stale', createdAt: NOW - PRIORITY_WEIGHTS.freshnessHalfLifeMs });
    const loved = makeTrace({ id: 'loved', createdAt: NOW, appreciations: 5 });
    const out = prioritizeTraces([stale, fresh, loved], NOW);
    expect(out.map((t) => t.id)).toEqual(['loved', 'fresh', 'stale']);
  });

  it('enforces the density cap', () => {
    const many = Array.from({ length: MAX_TRACES_PER_CHUNK + 10 }, (_, i) =>
      makeTrace({ id: `t${i}`, createdAt: NOW - i }),
    );
    expect(prioritizeTraces(many, NOW)).toHaveLength(MAX_TRACES_PER_CHUNK);
  });

  it('respects an explicit smaller cap', () => {
    const many = Array.from({ length: 5 }, (_, i) => makeTrace({ id: `t${i}` }));
    expect(prioritizeTraces(many, NOW, 2)).toHaveLength(2);
  });

  it('breaks ties deterministically by createdAt desc then id asc', () => {
    // identical priority (same createdAt, no appreciations/warmth) → id asc
    const a = makeTrace({ id: 'b', createdAt: NOW });
    const b = makeTrace({ id: 'a', createdAt: NOW });
    expect(prioritizeTraces([a, b], NOW).map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('does not mutate its input', () => {
    const input = [
      makeTrace({ id: 'x', createdAt: NOW - 1 }),
      makeTrace({ id: 'y', createdAt: NOW }),
    ];
    const snapshot = input.map((t) => t.id);
    prioritizeTraces(input, NOW);
    expect(input.map((t) => t.id)).toEqual(snapshot);
  });

  it('returns an empty list for a zero or negative cap', () => {
    expect(prioritizeTraces([makeTrace()], NOW, 0)).toEqual([]);
    expect(prioritizeTraces([makeTrace()], NOW, -3)).toEqual([]);
  });
});
