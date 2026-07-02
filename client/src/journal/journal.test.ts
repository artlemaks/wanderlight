import { describe, it, expect } from 'vitest';
import type { JournalEvent } from '@wanderlight/shared';
import { toJournalEntry, summarizeJournal, JOURNAL_KIND_LABELS } from './journal';

function ev(kind: JournalEvent['kind'], id = 'e'): JournalEvent {
  return { id, playerId: 'p', kind, refId: null, createdAt: 0 };
}

describe('toJournalEntry', () => {
  it('labels an event by kind', () => {
    const entry = toJournalEntry(ev('first_light'));
    expect(entry.label).toBe(JOURNAL_KIND_LABELS.first_light);
    expect(entry.kind).toBe('first_light');
  });
});

describe('summarizeJournal', () => {
  it('rolls the feed into header totals', () => {
    const feed = [
      ev('place_trace'),
      ev('place_trace'),
      ev('receive_appreciation'),
      ev('offering'),
      ev('collect_mote'),
      ev('visit'),
    ];
    expect(summarizeJournal(feed)).toEqual({
      placesVisited: 1,
      tracesLeft: 2,
      appreciationsReceived: 1,
      shrinesContributed: 1,
      motesGathered: 1,
    });
  });
});
