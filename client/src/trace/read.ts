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
