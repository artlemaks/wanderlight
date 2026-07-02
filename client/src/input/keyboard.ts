import type { Vec2 } from '../traveler';

/**
 * Keyboard movement input (P0-CLI-01). Tracks held WASD / arrow keys and reports a direction
 * vector in screen space (+x right, +y down). Not normalized — the traveler normalizes so diagonal
 * movement isn't faster.
 */
export class KeyboardInput {
  private readonly pressed = new Set<string>();

  private readonly onDown = (e: KeyboardEvent): void => {
    this.pressed.add(e.key.toLowerCase());
  };
  private readonly onUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.key.toLowerCase());
  };

  constructor(private readonly target: Window = window) {
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
  }

  /** Current movement direction from held keys. Zero vector when nothing relevant is pressed. */
  direction(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.anyHeld('a', 'arrowleft')) x -= 1;
    if (this.anyHeld('d', 'arrowright')) x += 1;
    if (this.anyHeld('w', 'arrowup')) y -= 1;
    if (this.anyHeld('s', 'arrowdown')) y += 1;
    return { x, y };
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
  }

  private anyHeld(...keys: string[]): boolean {
    return keys.some((k) => this.pressed.has(k));
  }
}
