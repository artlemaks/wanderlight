import { describe, expect, it } from 'vitest';
import type { Camera } from '@wanderlight/shared';
import { updateCamera } from './followCamera';
import type { WorldBounds } from './followCamera';

function camera(x = 0, y = 0, width = 20, height = 10): Camera {
  return { x, y, width, height };
}

/** Center of a camera view in world tiles. */
function center(c: Camera): { x: number; y: number } {
  return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
}

describe('updateCamera', () => {
  it('eases toward centering the target rather than snapping in one frame', () => {
    const cam = camera(0, 0, 20, 10); // centered on (10, 5)
    const next = updateCamera(cam, 100, 100, 1 / 60);
    const c = center(next);
    // Moved toward the target...
    expect(c.x).toBeGreaterThan(10);
    expect(c.y).toBeGreaterThan(5);
    // ...but nowhere near arriving in a single 1/60s frame.
    expect(c.x).toBeLessThan(100);
    expect(c.y).toBeLessThan(100);
  });

  it('converges to centering the target when it holds still', () => {
    let cam = camera(0, 0, 20, 10);
    for (let i = 0; i < 600; i++) cam = updateCamera(cam, 40, 25, 1 / 60);
    const c = center(cam);
    expect(c.x).toBeCloseTo(40, 3);
    expect(c.y).toBeCloseTo(25, 3);
  });

  it('clamps to world bounds instead of scrolling past the edge', () => {
    const bounds: WorldBounds = { minX: 0, minY: 0, maxX: 30, maxY: 30 };
    let cam = camera(10, 10, 20, 10);
    // Target sits beyond the far edge; converge, then assert we stopped at the clamp.
    for (let i = 0; i < 600; i++) cam = updateCamera(cam, 1000, 1000, 1 / 60, bounds);
    expect(cam.x).toBeCloseTo(bounds.maxX - cam.width, 6); // 30 - 20 = 10
    expect(cam.y).toBeCloseTo(bounds.maxY - cam.height, 6); // 30 - 10 = 20
  });

  it('does not scroll past the near edge', () => {
    const bounds: WorldBounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    let cam = camera(50, 50, 20, 10);
    for (let i = 0; i < 600; i++) cam = updateCamera(cam, -1000, -1000, 1 / 60, bounds);
    expect(cam.x).toBeCloseTo(bounds.minX, 6);
    expect(cam.y).toBeCloseTo(bounds.minY, 6);
  });

  it('centers on an axis smaller than the viewport (no edge jitter)', () => {
    const bounds: WorldBounds = { minX: 0, minY: 0, maxX: 8, maxY: 4 }; // narrower than 20x10 view
    const next = updateCamera(camera(0, 0, 20, 10), 4, 2, 1 / 60, bounds);
    // top-left = midpoint - size/2 = (8/2 - 20/2, 4/2 - 10/2)
    expect(next.x).toBeCloseTo(4 - 10, 6);
    expect(next.y).toBeCloseTo(2 - 5, 6);
  });

  it('does not mutate the input camera and preserves its dimensions', () => {
    const cam = camera(3, 4, 20, 10);
    const snapshot = { ...cam };
    const next = updateCamera(cam, 50, 50, 1 / 60);
    expect(cam).toEqual(snapshot);
    expect(next.width).toBe(20);
    expect(next.height).toBe(10);
  });
});
