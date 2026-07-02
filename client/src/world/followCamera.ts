import type { Camera } from '@wanderlight/shared';

/**
 * Follow camera (P0-CLI-02) — pure, frame-rate-independent.
 *
 * The camera keeps the traveler centered by easing its top-left corner toward the position that
 * would center the target, rather than snapping, which gives a soft trailing feel. Optional world
 * bounds clamp the view so it never scrolls past the edge; when an axis of the world is smaller
 * than the viewport the camera centers on that axis instead of clamping (which would jitter).
 */

export interface WorldBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Camera-follow easing rate (per second). Higher = tighter tracking; lower = more trailing. */
export const CAMERA_LERP = 5;

/** Clamp `topLeft` so a `size`-wide view stays within `[min, max]`; center if the span is too small. */
function clampAxis(topLeft: number, size: number, min: number, max: number): number {
  const span = max - min;
  if (span <= size) {
    // World smaller than the viewport on this axis — center it, no clamping (avoids edge jitter).
    return min + (span - size) / 2;
  }
  return Math.min(Math.max(topLeft, min), max - size);
}

/**
 * Ease the camera toward centering `(targetX, targetY)` after `dt` seconds. Pure: returns a new
 * camera and never mutates its argument. When `bounds` is given the result is kept within them.
 */
export function updateCamera(
  camera: Camera,
  targetX: number,
  targetY: number,
  dt: number,
  bounds?: WorldBounds,
): Camera {
  const step = Math.max(0, dt);

  const desiredX = targetX - camera.width / 2;
  const desiredY = targetY - camera.height / 2;

  const k = Math.min(1, CAMERA_LERP * step);
  let x = camera.x + (desiredX - camera.x) * k;
  let y = camera.y + (desiredY - camera.y) * k;

  if (bounds) {
    x = clampAxis(x, camera.width, bounds.minX, bounds.maxX);
    y = clampAxis(y, camera.height, bounds.minY, bounds.maxY);
  }

  return { x, y, width: camera.width, height: camera.height };
}
