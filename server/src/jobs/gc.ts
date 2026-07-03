/**
 * Fade + garbage-collection job (P2-SRV-07).
 *
 * Periodically removes traces that are old, unappreciated, and expired — and fades their warmth back
 * out of the world — keeping the map self-curating without ever deleting something a traveler
 * valued. The safety predicate (`isGcEligible`) is shared + unit-tested; the deletion + warmth fade
 * is a single repo transaction (`gcTraces`). This wraps it as a schedulable {@link Job} with perf
 * logging. Cadence is hourly by default — GC is housekeeping, not real-time.
 */

import type { Repository } from '../repo/types';
import type { Job, JobLogger } from './scheduler';

/** Default interval between GC runs (ms). Hourly — traces expire on the order of days. */
export const GC_INTERVAL_MS = 60 * 60 * 1000;

export function createFadeGcJob(repo: Repository, logger?: JobLogger): Job {
  return {
    name: 'trace-fade-gc',
    async run(now) {
      const summary = await repo.gcTraces(now);
      if (summary.removed > 0) {
        logger?.info(summary, 'gc.removed');
      }
      return summary;
    },
  };
}
