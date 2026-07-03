/**
 * Background-jobs wiring (P2). Builds the scheduler with every registered job so the entrypoint can
 * `start()` it on boot and `stop()` it on shutdown. New jobs (fade/GC in P2-SRV-07) register here.
 */

import type { Repository } from '../repo/types';
import type { PaymentProvider } from '../payments/provider';
import { createScheduler, type JobLogger, type ScheduledJob, type Scheduler } from './scheduler';
import { createFootpathAggregationJob, FOOTPATH_AGGREGATION_INTERVAL_MS } from './footpath';
import { createFadeGcJob, GC_INTERVAL_MS } from './gc';
import { createReconciliationJob, RECONCILE_INTERVAL_MS } from './reconcile';

export function buildScheduler(
  repo: Repository,
  logger?: JobLogger,
  payments?: PaymentProvider,
): Scheduler {
  const jobs: ScheduledJob[] = [
    {
      job: createFootpathAggregationJob(repo, logger),
      intervalMs: FOOTPATH_AGGREGATION_INTERVAL_MS,
    },
    {
      job: createFadeGcJob(repo, logger),
      intervalMs: GC_INTERVAL_MS,
    },
  ];
  // Reconciliation only runs when a payment provider is wired (P4-SRV-06).
  if (payments) {
    jobs.push({
      job: createReconciliationJob(repo, payments, logger),
      intervalMs: RECONCILE_INTERVAL_MS,
    });
  }
  return createScheduler(jobs, { logger });
}
