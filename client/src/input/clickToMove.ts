import { TILE_SIZE, type Camera } from '@wanderlight/shared';
import type { Vec2 } from '../traveler';

/**
 * Click-to-move input (P0-CLI-01). Converts a screen-space click into a world-tile destination
 * using the camera at click time, and hands it to the traveler once via {@link consume}.
 *
 * Screen→world is the inverse of the render pan: a world tile `t` draws at screen pixel
 * `(t - camera.topLeft) * TILE_SIZE`, so `world = camera.topLeft + screenPx / TILE_SIZE`.
 */
export function screenToWorld(screenX: number, screenY: number, camera: Camera): Vec2 {
  return { x: camera.x + screenX / TILE_SIZE, y: camera.y + screenY / TILE_SIZE };
}

export class ClickToMove {
  private pending: Vec2 | null = null;

  private readonly onDown = (e: PointerEvent): void => {
    this.pending = screenToWorld(e.clientX, e.clientY, this.getCamera());
  };

  constructor(
    private readonly getCamera: () => Camera,
    private readonly target: Window = window,
  ) {
    target.addEventListener('pointerdown', this.onDown);
  }

  /** The most recent click target, if any, cleared on read so it's applied for exactly one frame. */
  consume(): Vec2 | null {
    const target = this.pending;
    this.pending = null;
    return target;
  }

  destroy(): void {
    this.target.removeEventListener('pointerdown', this.onDown);
  }
}
