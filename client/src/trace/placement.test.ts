import { describe, it, expect } from 'vitest';
import {
  openRadial,
  selectTraceType,
  closeRadial,
  isReadyToCompose,
  CLOSED_RADIAL,
  PLACEABLE_TYPES,
} from './placement';

describe('placement radial', () => {
  it('exposes the P1 placeable types', () => {
    expect(PLACEABLE_TYPES).toContain('signpost');
    expect(PLACEABLE_TYPES).toContain('lantern');
  });

  it('opens at a world position with no selection', () => {
    const s = openRadial(12, -5);
    expect(s).toEqual({ open: true, at: { x: 12, y: -5 }, selected: null });
    expect(isReadyToCompose(s)).toBe(false);
  });

  it('selects a type once open and becomes ready to compose', () => {
    const s = selectTraceType(openRadial(0, 0), 'signpost');
    expect(s.selected).toBe('signpost');
    expect(isReadyToCompose(s)).toBe(true);
  });

  it('ignores selection while closed', () => {
    expect(selectTraceType(CLOSED_RADIAL, 'lantern')).toEqual(CLOSED_RADIAL);
  });

  it('closes back to the closed state', () => {
    expect(closeRadial()).toEqual(CLOSED_RADIAL);
    expect(isReadyToCompose(closeRadial())).toBe(false);
  });
});
