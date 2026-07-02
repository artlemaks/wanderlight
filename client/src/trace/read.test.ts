import { describe, it, expect } from 'vitest';
import type { Trace } from '@wanderlight/shared';
import {
  appreciateAvailability,
  giftClaimAvailability,
  lanternLightAvailability,
  renderSignpostText,
} from './read';
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

describe('giftClaimAvailability', () => {
  const gift = () => makeTrace({ type: 'gift', authorId: 'author', payload: {} });

  it('lets another traveler claim an unclaimed gift', () => {
    expect(giftClaimAvailability(gift(), 'finder')).toEqual({ available: true, reason: '' });
  });

  it('forbids claiming your own gift', () => {
    expect(giftClaimAvailability(gift(), 'author').available).toBe(false);
  });

  it('forbids claiming an already-claimed gift', () => {
    const res = giftClaimAvailability(makeTrace({ type: 'gift', claimedBy: 'someone' }), 'finder');
    expect(res.available).toBe(false);
    expect(res.reason).toMatch(/claimed/);
  });

  it('is unavailable for non-gift traces', () => {
    expect(giftClaimAvailability(makeTrace({ type: 'signpost' }), 'finder').available).toBe(false);
  });
});

describe('lanternLightAvailability', () => {
  it('offers lighting a lantern the viewer has not lit', () => {
    expect(lanternLightAvailability(makeTrace({ type: 'lantern' }), false)).toEqual({
      available: true,
      reason: '',
    });
  });

  it('disables after the viewer has lit it', () => {
    expect(lanternLightAvailability(makeTrace({ type: 'lantern' }), true).available).toBe(false);
  });

  it('is unavailable for non-lantern traces', () => {
    expect(lanternLightAvailability(makeTrace({ type: 'gift' }), false).available).toBe(false);
  });
});
