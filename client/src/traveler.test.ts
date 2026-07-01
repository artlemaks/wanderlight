import { describe, expect, it } from 'vitest';
import { ARRIVE_EPSILON, createTraveler, TRAVELER_SPEED, updateTraveler } from './traveler';
import type { TravelerState } from './traveler';

const NO_INPUT = { dir: { x: 0, y: 0 }, clickTarget: null } as const;

/** Run the traveler forward for `seconds` at a fixed timestep with a constant input. */
function simulate(
  state: TravelerState,
  input: { dir: { x: number; y: number }; clickTarget: { x: number; y: number } | null },
  seconds: number,
  dt = 1 / 60,
): TravelerState {
  let s = state;
  const steps = Math.round(seconds / dt);
  // Only the first frame carries a fresh clickTarget; later frames just hold the direction.
  for (let i = 0; i < steps; i++) {
    s = updateTraveler(s, i === 0 ? input : { dir: input.dir, clickTarget: null }, dt);
  }
  return s;
}

describe('updateTraveler — keyboard', () => {
  it('glides in the held direction and approaches top speed', () => {
    const end = simulate(createTraveler(), { dir: { x: 1, y: 0 }, clickTarget: null }, 1);
    expect(end.x).toBeGreaterThan(0);
    expect(end.y).toBeCloseTo(0, 5);
    expect(end.vx).toBeGreaterThan(TRAVELER_SPEED * 0.9);
  });

  it('eases in rather than jumping to full speed on the first frame', () => {
    const first = updateTraveler(createTraveler(), { dir: { x: 1, y: 0 }, clickTarget: null }, 1 / 60);
    expect(first.vx).toBeGreaterThan(0);
    expect(first.vx).toBeLessThan(TRAVELER_SPEED);
  });

  it('normalizes diagonal input so diagonal speed is not faster', () => {
    const straight = updateTraveler(createTraveler(), { dir: { x: 1, y: 0 }, clickTarget: null }, 1 / 60);
    const diagonal = updateTraveler(createTraveler(), { dir: { x: 1, y: 1 }, clickTarget: null }, 1 / 60);
    const straightSpeed = Math.hypot(straight.vx, straight.vy);
    const diagonalSpeed = Math.hypot(diagonal.vx, diagonal.vy);
    expect(diagonalSpeed).toBeCloseTo(straightSpeed, 6);
  });

  it('coasts to a near-stop after input is released (glide, not instant stop)', () => {
    const moving = simulate(createTraveler(), { dir: { x: 1, y: 0 }, clickTarget: null }, 1);
    const coasting = updateTraveler(moving, NO_INPUT, 1 / 60);
    expect(Math.abs(coasting.vx)).toBeLessThan(Math.abs(moving.vx));
    expect(coasting.x).toBeGreaterThan(moving.x); // still drifting forward
  });
});

describe('updateTraveler — click-to-move', () => {
  it('travels toward a clicked target and stops within arrival epsilon', () => {
    const end = simulate(createTraveler(), NO_INPUT_WITH_CLICK({ x: 5, y: 0 }), 3);
    expect(Math.hypot(end.x - 5, end.y - 0)).toBeLessThanOrEqual(ARRIVE_EPSILON + 1e-6);
    expect(end.target).toBeNull();
  });

  it('does not overshoot the target in a single large-dt frame', () => {
    // dt large enough that uncapped full speed would fly past the target.
    const near = updateTraveler(createTraveler(), NO_INPUT_WITH_CLICK({ x: 0.1, y: 0 }), 1);
    expect(near.x).toBeLessThanOrEqual(0.1 + 1e-6);
  });

  it('keyboard input cancels an in-progress click trip', () => {
    const enRoute = simulate(createTraveler(), NO_INPUT_WITH_CLICK({ x: 10, y: 0 }), 0.2);
    expect(enRoute.target).not.toBeNull();
    const overridden = updateTraveler(enRoute, { dir: { x: -1, y: 0 }, clickTarget: null }, 1 / 60);
    expect(overridden.target).toBeNull();
  });
});

describe('updateTraveler — purity & edges', () => {
  it('does not mutate the input state', () => {
    const start = createTraveler(2, 3);
    const snapshot = { ...start };
    updateTraveler(start, { dir: { x: 1, y: 0 }, clickTarget: null }, 1 / 60);
    expect(start).toEqual(snapshot);
  });

  it('treats a zero/negative dt as no movement', () => {
    const start = createTraveler(1, 1);
    const zero = updateTraveler(start, { dir: { x: 1, y: 0 }, clickTarget: null }, 0);
    expect(zero.x).toBe(1);
    expect(zero.y).toBe(1);
    const negative = updateTraveler(start, { dir: { x: 1, y: 0 }, clickTarget: null }, -0.5);
    expect(negative.x).toBe(1);
  });
});

/** Helper: an input carrying a fresh click target and no keyboard direction. */
function NO_INPUT_WITH_CLICK(target: { x: number; y: number }) {
  return { dir: { x: 0, y: 0 }, clickTarget: target } as const;
}
