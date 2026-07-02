import { afterEach, describe, expect, it } from 'vitest';
import { anonymousId, capture } from './posthog';

/**
 * Seam tests for the guarded client analytics (P0-ANL-01). These do NOT exercise posthog-js
 * (an optional, uninstalled dependency) — they lock the two behaviors the seam guarantees before
 * any key is provisioned: a stable anonymous distinct-id, and that emitting `session_start`
 * (and any event) is a safe no-op until a client is configured. Live PostHog ingestion is verified
 * separately once VITE_POSTHOG_KEY + posthog-js are activated.
 */

/** Minimal localStorage stub so anonymousId()'s persistence branch runs in the node test env. */
function installLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string): string | null => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string): void => void store.set(k, v),
    removeItem: (k: string): void => void store.delete(k),
    clear: (): void => store.clear(),
  };
}

describe('client analytics seam (P0-ANL-01)', () => {
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('persists a stable anon_ distinct-id across calls when storage is available', () => {
    installLocalStorage();
    const first = anonymousId();
    expect(first).toMatch(/^anon_/);
    expect(anonymousId()).toBe(first); // reused from storage, not regenerated
  });

  it('falls back to an ephemeral anon_ id when storage is unavailable', () => {
    // No localStorage installed → the bare reference throws → catch path returns an ephemeral id.
    expect(anonymousId()).toMatch(/^anon_/);
  });

  it('capture(session_start) before init is a safe no-op — no client, no throw', () => {
    expect(() => capture('session_start', { seedVersion: 1 })).not.toThrow();
  });
});
