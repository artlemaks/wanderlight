/**
 * Trace-placement radial state (P1-CLI-03) — pure core.
 *
 * The radial lets a player open a menu, pick a trace type, then move to the composer/confirm step.
 * These pure transitions model that flow so the PixiJS radial widget stays a thin shell that just
 * renders `RadialState` and dispatches these functions.
 */

import { TRACE_TYPES, type TraceType } from '@wanderlight/shared';

/** The trace types a player can place in P1, in radial display order. */
export const PLACEABLE_TYPES: readonly TraceType[] = TRACE_TYPES;

export interface RadialState {
  readonly open: boolean;
  /** The world-tile position the trace will be placed at, captured when the radial opens. */
  readonly at: { readonly x: number; readonly y: number } | null;
  readonly selected: TraceType | null;
}

export const CLOSED_RADIAL: RadialState = { open: false, at: null, selected: null };

/** Open the radial at a world position, clearing any prior selection. */
export function openRadial(x: number, y: number): RadialState {
  return { open: true, at: { x, y }, selected: null };
}

/** Select a trace type (no-op if the radial is closed). */
export function selectTraceType(state: RadialState, type: TraceType): RadialState {
  if (!state.open) return state;
  return { ...state, selected: type };
}

/** Close the radial. */
export function closeRadial(): RadialState {
  return CLOSED_RADIAL;
}

/** Ready to advance to the composer/confirm step: open, positioned, and a type chosen. */
export function isReadyToCompose(state: RadialState): boolean {
  return state.open && state.at !== null && state.selected !== null;
}
