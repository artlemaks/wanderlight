/**
 * Error reporting (P0-INFRA-06) — a thin, framework-agnostic seam over Sentry.
 *
 * Sentry is an **optional, guarded** dependency: it is only loaded when `SENTRY_DSN` is set AND the
 * `@sentry/node` package is installed. Otherwise the app runs against {@link noopReporter}. This
 * keeps local dev and CI green with no extra dependency in the lockfile — activation is:
 *   `npm i @sentry/node` + set `SENTRY_DSN`.
 * The dynamic import uses a variable specifier so the compiler doesn't require the package to be
 * present.
 */

export interface ErrorReporter {
  /** Report an exception with optional structured context (e.g. request id, route). */
  captureException(err: unknown, context?: Record<string, unknown>): void;
  /** Flush buffered events before shutdown. Resolves even if nothing is buffered. */
  flush(): Promise<void>;
}

/** Minimal logger surface (Fastify's `app.log` satisfies it) for the "not installed" warning. */
interface WarnLogger {
  warn(obj: unknown, msg?: string): void;
}

/** Does nothing — the default when Sentry is not configured. */
export const noopReporter: ErrorReporter = {
  captureException() {},
  async flush() {},
};

/**
 * Build an {@link ErrorReporter}. Returns {@link noopReporter} when `dsn` is falsy or when
 * `@sentry/node` cannot be loaded (logging a one-time warning in the latter case).
 */
export async function createErrorReporter(
  dsn: string | undefined,
  log?: WarnLogger,
): Promise<ErrorReporter> {
  if (!dsn) return noopReporter;

  try {
    const specifier = '@sentry/node';
    const Sentry = (await import(specifier)) as {
      init(opts: Record<string, unknown>): void;
      captureException(err: unknown, hint?: Record<string, unknown>): void;
      flush(timeout?: number): Promise<boolean>;
    };
    Sentry.init({ dsn, tracesSampleRate: 0 });
    return {
      captureException(err, context) {
        Sentry.captureException(err, context ? { extra: context } : undefined);
      },
      async flush() {
        await Sentry.flush(2000);
      },
    };
  } catch (err) {
    log?.warn(
      { err },
      'SENTRY_DSN is set but @sentry/node is not installed — error reporting disabled (run `npm i @sentry/node`)',
    );
    return noopReporter;
  }
}
