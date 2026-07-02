/**
 * Footpath aggregation job (P2-SRV-03).
 *
 * Rolls buffered movement-heat samples into per-chunk footfall counters + warmth. The storage-heavy
 * grouping lives in the repo (`aggregateFootpaths`, mirrored across memory + Postgres); this wraps it
 * as a schedulable {@link Job} with perf logging. Default cadence is generous — footpaths wear over
 * time, not in real time — and the repo caps each run so it stays within budget.
 */

import type { Repository } from '../repo/types';
import type { Job, JobLogger } from './scheduler';

/** Default interval between aggregation runs (ms). Footpaths are a slow, ambient signal. */
export const FOOTPATH_AGGREGATION_INTERVAL_MS = 60_000;

export function createFootpathAggregationJob(repo: Repository, logger?: JobLogger): Job {
  return {
    name: 'footpath-aggregation',
    async run(now) {
      const summary = await repo.aggregateFootpaths(now);
      if (summary.samplesProcessed > 0) {
        logger?.info(summary, 'footpath.aggregated');
      }
      return summary;
    },
  };
}
