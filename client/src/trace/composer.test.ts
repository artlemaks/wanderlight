import { describe, it, expect } from 'vitest';
import {
  fillTemplate,
  isComposerComplete,
  validateComposerSelection,
  buildSignpostPayload,
  type ComposerTemplate,
  type WordBanks,
} from './composer';

const template: ComposerTemplate = {
  id: 'encourage-01',
  text: 'Keep going, wanderer - a {adjective} {place} waits just ahead.',
  slots: ['adjective', 'place'],
};

const banks: WordBanks = {
  adjective: ['gentle', 'quiet'],
  place: ['grove', 'meadow'],
};

describe('fillTemplate', () => {
  it('replaces every slot marker with its chosen word', () => {
    expect(fillTemplate(template.text, { adjective: 'gentle', place: 'grove' })).toBe(
      'Keep going, wanderer - a gentle grove waits just ahead.',
    );
  });

  it('leaves unfilled markers intact', () => {
    expect(fillTemplate(template.text, { adjective: 'gentle' })).toBe(
      'Keep going, wanderer - a gentle {place} waits just ahead.',
    );
  });
});

describe('isComposerComplete', () => {
  it('is true only when every slot has a non-empty value', () => {
    expect(isComposerComplete(template, { adjective: 'gentle', place: 'grove' })).toBe(true);
    expect(isComposerComplete(template, { adjective: 'gentle', place: '' })).toBe(false);
    expect(isComposerComplete(template, { adjective: 'gentle' })).toBe(false);
  });
});

describe('validateComposerSelection', () => {
  it('accepts a fully-filled selection drawn from the banks', () => {
    expect(
      validateComposerSelection(template, banks, { adjective: 'quiet', place: 'meadow' }),
    ).toBeNull();
  });

  it('rejects a missing slot', () => {
    expect(validateComposerSelection(template, banks, { adjective: 'quiet' })).toMatch(/place/);
  });

  it('rejects a word that is not in the bank (no free text)', () => {
    expect(
      validateComposerSelection(template, banks, { adjective: 'quiet', place: 'volcano' }),
    ).toMatch(/not an option/);
  });
});

describe('buildSignpostPayload', () => {
  it('produces a payload with the template id and a copy of the slots', () => {
    const slots = { adjective: 'gentle', place: 'grove' };
    const payload = buildSignpostPayload('encourage-01', slots);
    expect(payload).toEqual({ templateId: 'encourage-01', slots });
    // defensive copy — mutating the source must not change the payload
    slots.place = 'meadow';
    expect(payload.slots.place).toBe('grove');
  });
});
