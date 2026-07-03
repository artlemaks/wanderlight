/**
 * Traveler journal view-model (P2-CLI-06) — pure core.
 *
 * Turns the raw journal feed (`GET /journal`) into a display list: a human label per event kind and
 * a small summary of totals (places visited, traces left, appreciations received, shrines
 * contributed) for the journal header. The DOM shell renders these; all mapping/formatting lives
 * here so it is unit-testable.
 */

import type { JournalEvent, JournalEventKind } from '@wanderlight/shared';

/** Human-readable label for each journal event kind. */
export const JOURNAL_KIND_LABELS: Readonly<Record<JournalEventKind, string>> = {
  visit: 'Visited a place',
  place_trace: 'Left a trace',
  appreciate: 'Thanked a trace',
  receive_appreciation: 'Received thanks',
  offering: 'Made an offering',
  gift_claim: 'Claimed a gift',
  collect_mote: 'Gathered a mote of light',
  first_light: 'First to light a lantern',
};

export interface JournalEntry {
  readonly id: string;
  readonly kind: JournalEventKind;
  readonly label: string;
  readonly refId: string | null;
  readonly createdAt: number;
}

/** Map a raw event to a labelled display entry. */
export function toJournalEntry(event: JournalEvent): JournalEntry {
  return {
    id: event.id,
    kind: event.kind,
    label: JOURNAL_KIND_LABELS[event.kind] ?? event.kind,
    refId: event.refId,
    createdAt: event.createdAt,
  };
}

export interface JournalSummary {
  readonly placesVisited: number;
  readonly tracesLeft: number;
  readonly appreciationsReceived: number;
  readonly shrinesContributed: number;
  readonly motesGathered: number;
}

/** Roll a feed into the header totals shown atop the journal. */
export function summarizeJournal(events: readonly JournalEvent[]): JournalSummary {
  const count = (kind: JournalEventKind): number => events.filter((e) => e.kind === kind).length;
  return {
    placesVisited: count('visit'),
    tracesLeft: count('place_trace'),
    appreciationsReceived: count('receive_appreciation'),
    shrinesContributed: count('offering'),
    motesGathered: count('collect_mote'),
  };
}
