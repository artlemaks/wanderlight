/**
 * Background-jobs wiring (P2). Builds the scheduler with every registered job so the entrypoint can
 * `start()` it on boot and `stop()` it on shutdown. New jobs (fade/GC in P2-SRV-07) register here.
 */

import type { Repository } from '../repo/types';
import { createScheduler, type JobLogger, type Scheduler } from './scheduler';
import { createFootpathAggregationJob, FOOTPATH_AGGREGATION_INTERVAL_MS } from './footpath';
import { createFadeGcJob, GC_INTERVAL_MS } from './gc';

export function buildScheduler(repo: Repository, logger?: JobLogger): Scheduler {
  return createScheduler(
    [
      {
        job: createFootpathAggregationJob(repo, logger),
        intervalMs: FOOTPATH_AGGREGATION_INTERVAL_MS,
      },
      {
        job: createFadeGcJob(repo, logger),
        intervalMs: GC_INTERVAL_MS,
      },
    ],
    { logger },
  );
}
