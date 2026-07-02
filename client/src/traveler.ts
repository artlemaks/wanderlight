/**
 * Traveler movement (P0-CLI-01) — pure, frame-rate-independent state update.
 *
 * The traveler glides: input sets a *desired* velocity and the actual velocity eases toward it,
 * giving the soft "glide" feel the scope asks for rather than instant start/stop. Two input modes
 * feed the same model:
 *  - keyboard (WASD / arrows) → a direction to hold;
 *  - click-to-move → a world-tile destination to travel to and stop at.
 * Keyboard input always overrides an active click target (grabbing the keys cancels the trip).
 *
 * This is client-local only (no server, no cross-client determinism contract), so ordinary float
 * math is fine here — unlike world generation in `@wanderlight/shared`.
 */

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface TravelerState {
  /** Position in world tiles. */
  readonly x: number;
  readonly y: number;
  /** Velocity in world tiles per second. */
  readonly vx: number;
  readonly vy: number;
  /** Active click-to-move destination in world tiles, or null when none. */
  readonly target: Vec2 | null;
}

export interface TravelerInput {
  /** Keyboard direction this frame (need not be normalized); the zero vector means "no keys". */
  readonly dir: Vec2;
  /** A click-to-move destination issued this frame, or null. Overridden by keyboard input. */
  readonly clickTarget: Vec2 | null;
}

/** Top movement speed, world tiles per second. */
export const TRAVELER_SPEED = 6;
/** Velocity-easing rate (per second). Higher = snappier; lower = floatier glide. */
export const TRAVELER_ACCEL = 8;
/** Distance (world tiles) within which a click target counts as reached. */
export const ARRIVE_EPSILON = 0.05;

/** A fresh traveler at a world-tile position, at rest with no target. */
export function createTraveler(x = 0, y = 0): TravelerState {
  return { x, y, vx: 0, vy: 0, target: null };
}

function isZero(v: Vec2): boolean {
  return v.x === 0 && v.y === 0;
}

/**
 * Advance the traveler by `dt` seconds given this frame's input. Pure: returns a new state and
 * never mutates its arguments. `dt` is clamped to be non-negative.
 */
export function updateTraveler(
  state: TravelerState,
  input: TravelerInput,
  dt: number,
): TravelerState {
  const step = Math.max(0, dt);
  const hasKeyboard = !isZero(input.dir);

  // Resolve the active click target: keyboard overrides + cancels it; a fresh click sets it.
  let target: Vec2 | null;
  if (hasKeyboard) {
    target = null;
  } else if (input.clickTarget) {
    target = input.clickTarget;
  } else {
    target = state.target;
  }

  // Desired velocity from whichever input mode is active.
  let desiredVx = 0;
  let desiredVy = 0;
  if (hasKeyboard) {
    const len = Math.hypot(input.dir.x, input.dir.y);
    desiredVx = (input.dir.x / len) * TRAVELER_SPEED;
    desiredVy = (input.dir.y / len) * TRAVELER_SPEED;
  } else if (target) {
    const toX = target.x - state.x;
    const toY = target.y - state.y;
    const dist = Math.hypot(toX, toY);
    const speedNow = Math.hypot(state.vx, state.vy);
    if (dist <= ARRIVE_EPSILON || dist <= speedNow * step) {
      // Arrived (or would reach/pass the target this frame): settle exactly on it and stop, so a
      // click-to-move trip ends on the destination instead of coasting past on glide momentum.
      return { x: target.x, y: target.y, vx: 0, vy: 0, target: null };
    }
    // Arrival slowdown: ease desired speed down near the target so momentum doesn't orbit it.
    // Also cap by dist/step so a single large-dt frame can't overshoot.
    let speed = Math.min(TRAVELER_SPEED, dist * TRAVELER_ACCEL);
    if (step > 0) speed = Math.min(speed, dist / step);
    desiredVx = (toX / dist) * speed;
    desiredVy = (toY / dist) * speed;
  }

  // Ease actual velocity toward desired (frame-rate-independent smoothing factor).
  const k = Math.min(1, TRAVELER_ACCEL * step);
  const vx = state.vx + (desiredVx - state.vx) * k;
  const vy = state.vy + (desiredVy - state.vy) * k;

  const x = state.x + vx * step;
  const y = state.y + vy * step;

  return { x, y, vx, vy, target };
}
