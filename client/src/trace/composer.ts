/**
 * Curated signpost composer (P1-CLI-04) + template rendering for reading (P1-CLI-02/05) — pure core.
 *
 * The composer lets a player pick a template and fill its slots from approved word banks — and
 * nothing else (no free text). These pure functions decide whether a selection is submittable and
 * render a template's final text; the PixiJS/DOM composer widget is a thin shell over them. Mirrors
 * the server's `validateSignpost` so the client can only offer what the server will accept.
 */

import type { SignpostPayload } from '@wanderlight/shared';

/** The subset of a content template the composer needs. */
export interface ComposerTemplate {
  readonly id: string;
  readonly text: string;
  readonly slots: readonly string[];
}

/** Word banks keyed by slot name. */
export type WordBanks = Readonly<Record<string, readonly string[]>>;

/** Replace every `{slot}` marker in `text` with its chosen word (unfilled slots left as `{slot}`). */
export function fillTemplate(text: string, slots: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const word = slots[name];
    return word === undefined ? match : word;
  });
}

/** Every slot the template needs has a chosen value. */
export function isComposerComplete(
  template: ComposerTemplate,
  slots: Readonly<Record<string, string>>,
): boolean {
  return template.slots.every((name) => (slots[name] ?? '') !== '');
}

/**
 * Validate a composer selection against the banks. Returns an error string, or null when the
 * selection is submittable: every required slot is filled and each word is in that slot's bank.
 */
export function validateComposerSelection(
  template: ComposerTemplate,
  banks: WordBanks,
  slots: Readonly<Record<string, string>>,
): string | null {
  for (const name of template.slots) {
    const word = slots[name];
    if (!word) return `Choose a word for "${name}"`;
    const bank = banks[name];
    if (!bank || !bank.includes(word)) return `"${word}" is not an option for "${name}"`;
  }
  return null;
}

/** Build the wire payload for a validated composer selection. */
export function buildSignpostPayload(
  templateId: string,
  slots: Readonly<Record<string, string>>,
): SignpostPayload {
  return { templateId, slots: { ...slots } };
}
