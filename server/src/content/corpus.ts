/**
 * Signpost content corpus: templates + word banks (P1-CNT-01/02), loaded from `/content`.
 *
 * This is what makes signposts abuse-resistant without moderation (scope §9): a submitted signpost
 * must name an existing template and fill exactly its slots with words drawn from the approved banks.
 * No free text is ever accepted. The corpus is the server-side source of truth for that validation
 * and for the client composer's options.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { SignpostPayload } from '@wanderlight/shared';

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'content');

export interface Template {
  readonly id: string;
  readonly category: string;
  readonly text: string;
  readonly slots: readonly string[];
}

export interface Corpus {
  readonly templates: ReadonlyMap<string, Template>;
  readonly banks: Readonly<Record<string, readonly string[]>>;
}

/** Build a corpus from parsed JSON (pure — no filesystem, so it is unit-testable with fixtures). */
export function buildCorpus(
  templatesJson: { templates: Template[] },
  banksJson: { banks: Record<string, string[]> },
): Corpus {
  const templates = new Map<string, Template>();
  for (const t of templatesJson.templates) templates.set(t.id, t);
  return { templates, banks: banksJson.banks };
}

/** Load the corpus from `/content`. Called once at server startup. */
export async function loadCorpus(dir: string = CONTENT_DIR): Promise<Corpus> {
  const [templatesRaw, banksRaw] = await Promise.all([
    readFile(join(dir, 'signpost-templates.json'), 'utf8'),
    readFile(join(dir, 'word-banks.json'), 'utf8'),
  ]);
  return buildCorpus(JSON.parse(templatesRaw), JSON.parse(banksRaw));
}

/**
 * Validate a signpost payload against the corpus. Returns an error string, or null if valid:
 * template must exist, its slot set must be filled exactly (no missing, no extra), and every filled
 * word must be in that slot's approved bank.
 */
export function validateSignpost(corpus: Corpus, payload: SignpostPayload): string | null {
  const template = corpus.templates.get(payload.templateId);
  if (!template) return `Unknown template "${payload.templateId}"`;

  const filled = Object.keys(payload.slots);
  const required = new Set(template.slots);
  for (const name of required) {
    if (!(name in payload.slots)) return `Missing slot "${name}"`;
  }
  for (const name of filled) {
    if (!required.has(name)) return `Unexpected slot "${name}"`;
    const bank = corpus.banks[name];
    if (!bank) return `No word bank for slot "${name}"`;
    const word = payload.slots[name];
    if (word === undefined || !bank.includes(word)) {
      return `Word "${word}" is not in the "${name}" bank`;
    }
  }
  return null;
}
