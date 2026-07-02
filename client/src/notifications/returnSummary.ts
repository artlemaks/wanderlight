/**
 * Return-summary view model (P3-CLI-01) — pure core, no PixiJS.
 *
 * Turns the `GET /notifications` appreciation summary into the headline + lines the return surface
 * shows when a traveler comes back ("Welcome back — 3 travelers thanked your traces"). Pure so the
 * wording is tested and the Pixi overlay is a thin shell.
 */

import { appreciationLine, type AppreciationSummary } from '@wanderlight/shared';

export interface ReturnSummaryView {
  /** Whether there is anything to show at all. */
  readonly hasNews: boolean;
  readonly headline: string;
  /** One line per thanked trace, most-thanked first. */
  readonly lines: readonly string[];
}

/** Build the return-summary view. Empty summary → `hasNews: false` and no overlay is shown. */
export function returnSummaryView(summary: AppreciationSummary): ReturnSummaryView {
  if (summary.totalNew === 0) {
    return { hasNews: false, headline: 'Welcome back', lines: [] };
  }
  const who = summary.totalNew === 1 ? 'a traveler' : `${summary.totalNew} travelers`;
  return {
    hasNews: true,
    headline: `Welcome back — ${who} thanked your traces`,
    lines: summary.traces.map(appreciationLine),
  };
}
