/**
 * Traveler journal (P2-DATA-02 / P2-CLI-06) — the personal history feed.
 *
 * A private, append-only log of a player's meaningful moments: places visited, traces left,
 * appreciations given + received, offerings made, gifts claimed, motes collected. Pure shape only;
 * the server records events on the relevant writes and the client renders them.
 */

/** The kinds of events the journal records. Add new kinds additively. */
export const JOURNAL_EVENT_KINDS = [
  'visit',
  'place_trace',
  'appreciate',
  'receive_appreciation',
  'offering',
  'gift_claim',
  'collect_mote',
  'first_light',
] as const;
export type JournalEventKind = (typeof JOURNAL_EVENT_KINDS)[number];

/** Is `v` a known journal event kind? Narrows at boundaries. */
export function isJournalEventKind(v: unknown): v is JournalEventKind {
  return typeof v === 'string' && (JOURNAL_EVENT_KINDS as readonly string[]).includes(v);
}

/** One journal entry. `refId` points at the trace/chunk/mote the event concerns (kind-dependent). */
export interface JournalEvent {
  readonly id: string;
  readonly playerId: string;
  readonly kind: JournalEventKind;
  readonly refId: string | null;
  /** Epoch milliseconds. */
  readonly createdAt: number;
}

/** `GET /journal` response: the caller's most-recent entries, newest first. */
export interface JournalResponse {
  readonly events: readonly JournalEvent[];
}
