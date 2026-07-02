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
  /** Payment provider name (e.g. 'stripe'); unset → guarded stub provider (P4-SRV-05). */
  readonly paymentsProvider: string | undefined;
  /** Payment provider API key; unset → stub. */
  readonly paymentsKey: string | undefined;
  /** Shared secret gating `/admin/*` routes (P4-OPS-01); unset → admin routes disabled. */
  readonly adminToken: string | undefined;
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
    paymentsProvider: env.PAYMENTS_PROVIDER,
    paymentsKey: env.PAYMENTS_KEY,
    adminToken: env.ADMIN_TOKEN,
  };
}
