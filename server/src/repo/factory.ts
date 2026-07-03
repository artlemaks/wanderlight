/**
 * Repository factory — picks the datastore the same way the observability seams pick their vendor.
 *
 * DATABASE_URL set → Postgres (guard-loads `pg`; throws with guidance if it isn't installed).
 * DATABASE_URL unset → in-memory, with a one-time warning. This keeps local dev and CI running with
 * zero external services while making the real DB a one-line activation.
 */

import { createMemoryRepository } from './memory';
import { createPostgresRepository } from './postgres';
import type { Repository } from './types';

export interface RepoLogger {
  warn(msg: string): void;
  info(msg: string): void;
}

export async function createRepository(
  databaseUrl: string | undefined,
  log?: RepoLogger,
): Promise<Repository> {
  if (!databaseUrl) {
    log?.warn('DATABASE_URL not set — using the in-memory datastore (data is not persisted).');
    return createMemoryRepository();
  }
  log?.info('DATABASE_URL set — connecting the Postgres datastore.');
  return createPostgresRepository(databaseUrl);
}
