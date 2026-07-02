import { describe, it, expect } from 'vitest';
import { parseChunkIds } from './world';

describe('parseChunkIds', () => {
  it('parses semicolon-separated cx,cy pairs', () => {
    expect(parseChunkIds('0,0;1,-2;3,4')).toEqual([
      { cx: 0, cy: 0 },
      { cx: 1, cy: -2 },
      { cx: 3, cy: 4 },
    ]);
  });

  it('returns empty for undefined or empty input', () => {
    expect(parseChunkIds(undefined)).toEqual([]);
    expect(parseChunkIds('')).toEqual([]);
  });

  it('skips malformed pairs', () => {
    expect(parseChunkIds('0,0;bad;2,x;3,4')).toEqual([
      { cx: 0, cy: 0 },
      { cx: 3, cy: 4 },
    ]);
  });

  it('deduplicates repeated chunk ids', () => {
    expect(parseChunkIds('0,0;0,0;1,1')).toEqual([
      { cx: 0, cy: 0 },
      { cx: 1, cy: 1 },
    ]);
  });
});
