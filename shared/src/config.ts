/**
 * Typed environment configuration (P0-INFRA-05).
 *
 * Isomorphic: pass an explicit `env` map (e.g. `process.env` on the server) so the reader
 * stays pure and testable, and never assumes a Node runtime on the client bundle.
 */

export interface AppConfig {
  readonly posthogKey: string | undefined;
  readonly posthogHost: string | undefined;
  readonly sentryDsn: string | undefined;
  readonly databaseUrl: string | undefined;
}

type EnvSource = Record<string, string | undefined>;

const nodeEnv: EnvSource = typeof process !== 'undefined' && process.env ? process.env : {};

/** Read known configuration keys from an env source (defaults to `process.env` when present). */
export function loadConfig(env: EnvSource = nodeEnv): AppConfig {
  return {
    posthogKey: env.POSTHOG_KEY,
    posthogHost: env.POSTHOG_HOST,
    sentryDsn: env.SENTRY_DSN,
    databaseUrl: env.DATABASE_URL,
  };
}
