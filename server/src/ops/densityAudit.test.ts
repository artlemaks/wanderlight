import { describe, it, expect } from 'vitest';
import { auditDensity, TARGET_CHUNK_DENSITY } from './densityAudit';

describe('auditDensity (P6-OPS-03)', () => {
  it('passes when every chunk meets the target', () => {
    const report = auditDensity({ countsByChunk: { '0,0': 5, '1,0': 3, '0,1': 4 } });
    expect(report.pass).toBe(true);
    expect(report.thinChunks).toEqual([]);
    expect(report.target).toBe(TARGET_CHUNK_DENSITY);
    expect(report.minCount).toBe(3);
  });

  it('flags thin chunks ascending by count as the top-up work list', () => {
    const report = auditDensity({ countsByChunk: { '0,0': 5, '1,0': 1, '0,1': 2, '2,0': 0 } });
    expect(report.pass).toBe(false);
    expect(report.thinChunks).toEqual(['2,0', '1,0', '0,1']);
  });

  it('respects a custom target', () => {
    const report = auditDensity({ countsByChunk: { '0,0': 5 }, target: 10 });
    expect(report.pass).toBe(false);
    expect(report.thinChunks).toEqual(['0,0']);
  });

  it('an empty world does not pass (nothing audited)', () => {
    expect(auditDensity({ countsByChunk: {} }).pass).toBe(false);
  });
});
