import { describe, it, expect } from 'vitest';
import type { Trace } from '@wanderlight/shared';
import { appreciateAvailability, renderSignpostText } from './read';
import type { ComposerTemplate } from './composer';

function makeTrace(over: Partial<Trace> = {}): Trace {
  return {
    id: 't1',
    type: 'signpost',
    chunkX: 0,
    chunkY: 0,
    x: 1,
    y: 1,
    authorId: 'author',
    payload: { templateId: 'encourage-01', slots: { adjective: 'gentle', place: 'grove' } },
    warmth: 1,
    appreciations: 0,
    litCount: 0,
    claimedBy: null,
    systemAuthored: false,
    createdAt: 0,
    expiresAt: null,
    ...over,
  };
}

describe('appreciateAvailability', () => {
  it('allows appreciating another player’s un-thanked trace', () => {
    expect(appreciateAvailability(makeTrace(), 'viewer', false)).toEqual({
      canAppreciate: true,
      reason: '',
    });
  });

  it('forbids appreciating your own trace', () => {
    const res = appreciateAvailability(makeTrace({ authorId: 'me' }), 'me', false);
    expect(res.canAppreciate).toBe(false);
    expect(res.reason).toMatch(/own/);
  });

  it('disables after the viewer has already appreciated', () => {
    const res = appreciateAvailability(makeTrace(), 'viewer', true);
    expect(res.canAppreciate).toBe(false);
    expect(res.reason).toMatch(/already/);
  });
});

describe('renderSignpostText', () => {
  it('renders a signpost by filling its template', () => {
    const template: ComposerTemplate = {
      id: 'encourage-01',
      text: 'a {adjective} {place} waits',
      slots: ['adjective', 'place'],
    };
    expect(renderSignpostText(makeTrace(), template)).toBe('a gentle grove waits');
  });
});
