import { describe, it, expect } from 'vitest';
import { hash32, hash2i, rand01 } from './rng';

describe('hash32', () => {
  it('is deterministic and returns a uint32', () => {
    const a = hash32(42);
    expect(hash32(42)).toBe(a);
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(2 ** 32);
  });

  it('separates nearby inputs', () => {
    expect(hash32(1)).not.toBe(hash32(2));
  });
});

describe('hash2i', () => {
  it('is deterministic for the same seed and coordinate', () => {
    expect(hash2i(12345, 10, -3)).toBe(hash2i(12345, 10, -3));
  });

  it('is order-sensitive (x,y not interchangeable)', () => {
    expect(hash2i(1, 2, 3)).not.toBe(hash2i(1, 3, 2));
  });

  it('varies with the seed', () => {
    expect(hash2i(1, 5, 5)).not.toBe(hash2i(2, 5, 5));
  });

  it('handles negative coordinates deterministically and stays uint32', () => {
    const h = hash2i(7, -100, -200);
    expect(hash2i(7, -100, -200)).toBe(h);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe('rand01', () => {
  it('maps a hash into [0, 1)', () => {
    for (const x of [0, 1, 42, 0xffffffff]) {
      const r = rand01(hash32(x));
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
  });
});
