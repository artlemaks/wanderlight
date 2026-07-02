/**
 * Read + appreciate UI logic (P1-CLI-05 / WM-84) — pure core.
 *
 * Decides whether the "thanks" (appreciate) action is available for a trace the traveler is reading,
 * and renders a signpost's final text. The button-disables-after-use and can't-thank-your-own-trace
 * rules mirror the server (`appreciateTrace`), so the UI never offers an action the server rejects.
 */

import type { SignpostPayload, Trace } from '@wanderlight/shared';
import { fillTemplate, type ComposerTemplate } from './composer';

export interface AppreciateAvailability {
  readonly canAppreciate: boolean;
  /** Why the action is unavailable, for a tooltip/label. Empty when `canAppreciate` is true. */
  readonly reason: string;
}

/** Can `viewerId` appreciate `trace`, given whether they already have? */
export function appreciateAvailability(
  trace: Trace,
  viewerId: string,
  alreadyAppreciated: boolean,
): AppreciateAvailability {
  if (trace.authorId === viewerId) {
    return { canAppreciate: false, reason: 'This is your own trace' };
  }
  if (alreadyAppreciated) {
    return { canAppreciate: false, reason: 'You already thanked this' };
  }
  return { canAppreciate: true, reason: '' };
}

/** Render a signpost trace's text by filling its template with the chosen slot words. */
export function renderSignpostText(trace: Trace, template: ComposerTemplate): string {
  const payload = trace.payload as SignpostPayload;
  return fillTemplate(template.text, payload.slots ?? {});
}

export interface InteractionAvailability {
  readonly available: boolean;
  /** Why the interaction is unavailable, for a tooltip/label. Empty when `available` is true. */
  readonly reason: string;
}

/**
 * Can `viewerId` claim `trace` as a gift (P2-SRV-01)? Mirrors the server: it must be an unclaimed
 * gift the viewer did not author. Keeps the UI from offering a claim the server would reject.
 */
export function giftClaimAvailability(trace: Trace, viewerId: string): InteractionAvailability {
  if (trace.type !== 'gift') return { available: false, reason: 'Not a gift' };
  if (trace.authorId === viewerId) return { available: false, reason: 'This is your own gift' };
  if (trace.claimedBy !== null) return { available: false, reason: 'Already claimed' };
  return { available: true, reason: '' };
}

/**
 * Can `viewerId` light `trace` (P2-DATA-01), given whether they already lit it? Lighting is
 * idempotent per player, so it is offered once per lantern per traveler.
 */
export function lanternLightAvailability(
  trace: Trace,
  alreadyLit: boolean,
): InteractionAvailability {
  if (trace.type !== 'lantern') return { available: false, reason: 'Not a lantern' };
  if (alreadyLit) return { available: false, reason: 'You already lit this' };
  return { available: true, reason: '' };
}
