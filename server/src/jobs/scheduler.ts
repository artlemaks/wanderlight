/**
 * Minimal background-job scheduler (P2 background jobs).
 *
 * The server had no job runner before P2; this is it. A `Job` is just a named async unit of work;
 * the scheduler runs each on a fixed interval, isolating failures (one job throwing never stops the
 * others or the process) and logging duration for the perf budget. `runAll` runs every job once
 * synchronously-awaited — used by tests and by a manual trigger — while `start`/`stop` drive the
 * timers in production (wired in index.ts). Deliberately dependency-free.
 */

export interface Job {
  readonly name: string;
  /** Do the work for logical time `now` (epoch ms). Returns a small summary for logging. */
  run(now: number): Promise<unknown>;
}

export interface ScheduledJob {
  readonly job: Job;
  readonly intervalMs: number;
}

export interface JobLogger {
  info(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
}

export interface SchedulerOptions {
  /** Injected clock so runs are deterministic in tests. Defaults to `Date.now`. */
  readonly now?: () => number;
  readonly logger?: JobLogger;
}

export interface Scheduler {
  /** Run every registered job once, awaiting each and isolating failures. Returns per-job outcomes. */
  runAll(): Promise<Array<{ name: string; ok: boolean }>>;
  /** Begin the interval timers (unref'd so they never keep the process alive). */
  start(): void;
  /** Clear all timers. */
  stop(): void;
}

/** Run one job once, catching + logging any error so a failure is isolated. */
async function runOne(job: Job, now: number, logger?: JobLogger): Promise<boolean> {
  const startedAt = now;
  try {
    const result = await job.run(now);
    logger?.info({ job: job.name, result }, 'job.done');
    return true;
  } catch (err) {
    logger?.error({ job: job.name, err, startedAt }, 'job.failed');
    return false;
  }
}

export function createScheduler(
  jobs: readonly ScheduledJob[],
  opts: SchedulerOptions = {},
): Scheduler {
  const now = opts.now ?? Date.now;
  const timers: ReturnType<typeof setInterval>[] = [];

  return {
    async runAll() {
      const out: Array<{ name: string; ok: boolean }> = [];
      for (const { job } of jobs) {
        out.push({ name: job.name, ok: await runOne(job, now(), opts.logger) });
      }
      return out;
    },

    start() {
      for (const { job, intervalMs } of jobs) {
        const timer = setInterval(() => void runOne(job, now(), opts.logger), intervalMs);
        // Do not let the job timer hold the event loop open on shutdown.
        (timer as { unref?: () => void }).unref?.();
        timers.push(timer);
      }
    },

    stop() {
      for (const timer of timers) clearInterval(timer);
      timers.length = 0;
    },
  };
}
