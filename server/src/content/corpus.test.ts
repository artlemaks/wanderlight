import { describe, it, expect } from 'vitest';
import { buildCorpus, validateSignpost, loadCorpus, type Corpus } from './corpus';

const corpus: Corpus = buildCorpus(
  {
    templates: [
      {
        id: 'encourage-01',
        category: 'encourage',
        text: 'a {adjective} {place}',
        slots: ['adjective', 'place'],
      },
    ],
  },
  { banks: { adjective: ['gentle', 'quiet'], place: ['grove', 'meadow'] } },
);

describe('validateSignpost', () => {
  it('accepts a valid template + in-bank slots', () => {
    expect(
      validateSignpost(corpus, {
        templateId: 'encourage-01',
        slots: { adjective: 'gentle', place: 'grove' },
      }),
    ).toBeNull();
  });

  it('rejects an unknown template', () => {
    expect(validateSignpost(corpus, { templateId: 'nope', slots: {} })).toMatch(/Unknown template/);
  });

  it('rejects a missing slot', () => {
    expect(
      validateSignpost(corpus, { templateId: 'encourage-01', slots: { adjective: 'gentle' } }),
    ).toMatch(/Missing slot/);
  });

  it('rejects an unexpected slot (would-be free text)', () => {
    expect(
      validateSignpost(corpus, {
        templateId: 'encourage-01',
        slots: { adjective: 'gentle', place: 'grove', extra: 'x' },
      }),
    ).toMatch(/Unexpected slot/);
  });

  it('rejects a word outside the bank', () => {
    expect(
      validateSignpost(corpus, {
        templateId: 'encourage-01',
        slots: { adjective: 'gentle', place: 'volcano' },
      }),
    ).toMatch(/not in the/);
  });
});

// Guards the authored content itself (P1-CNT-01/02 acceptance): 40 templates, every slot banked.
describe('authored content corpus', () => {
  it('loads with 40 templates and a bank for every slot used', async () => {
    const real = await loadCorpus();
    expect(real.templates.size).toBe(40);
    for (const template of real.templates.values()) {
      expect(template.slots.length).toBeGreaterThan(0);
      for (const slot of template.slots) {
        const bank = real.banks[slot];
        expect(bank, `bank for slot "${slot}"`).toBeDefined();
        expect(bank!.length).toBeGreaterThanOrEqual(20);
      }
    }
  });
});
