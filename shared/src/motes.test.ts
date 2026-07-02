import { describe, it, expect } from 'vitest';
import { motesInChunk, moteExists, parseMoteId } from './motes';
import { WORLD_SEED } from './constants';

describe('motesInChunk', () => {
  it('is deterministic for a seed + chunk', () => {
    const a = motesInChunk(WORLD_SEED, 0, 0);
    const b = motesInChunk(WORLD_SEED, 0, 0);
    expect(a).toEqual(b);
  });

  it('spawns motes that validate via moteExists', () => {
    const motes = motesInChunk(WORLD_SEED, 0, 0);
    // The First Vale origin chunk should have at least one mote at this seed.
    expect(motes.length).toBeGreaterThan(0);
    for (const m of motes) expect(moteExists(WORLD_SEED, m.id)).toBe(true);
  });

  it('gives different chunks different mote sets', () => {
    expect(motesInChunk(WORLD_SEED, 0, 0)).not.toEqual(motesInChunk(WORLD_SEED, 5, 7));
  });
});

describe('moteExists / parseMoteId', () => {
  it('rejects a fabricated mote id', () => {
    // A position where no mote spawns (validated by absence from the chunk list).
    const present = new Set(motesInChunk(WORLD_SEED, 0, 0).map((m) => m.id));
    const fabricated = 'm:0,0:63,63';
    if (!present.has(fabricated)) expect(moteExists(WORLD_SEED, fabricated)).toBe(false);
  });

  it('rejects malformed ids', () => {
    expect(moteExists(WORLD_SEED, 'not-a-mote')).toBe(false);
    expect(parseMoteId('nope')).toBeNull();
  });

  it('round-trips a valid id', () => {
    expect(parseMoteId('m:1,-2:3,4')).toEqual({ cx: 1, cy: -2, lx: 3, ly: 4 });
  });
});
