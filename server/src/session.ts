/**
 * Anonymous session bootstrap (P1-SRV-02).
 *
 * A visitor is identified by a stable **device token** sent in the `x-device-token` header. On first
 * contact (no token, or a token we've never seen) we mint one and create the backing player row, so
 * every request is attributable to an account with zero sign-up friction. P3 upgrades this to email
 * without changing the anon path.
 */

import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { Player, Repository } from './repo/types';

export const DEVICE_TOKEN_HEADER = 'x-device-token';

export interface ResolvedSession {
  readonly player: Player;
  /** The device token to echo back so a first-time visitor can persist it. */
  readonly deviceToken: string;
  /** True when we minted the token this request (new visitor). */
  readonly issued: boolean;
}

/** Resolve (or create) the player for a request from its device-token header. */
export async function resolveSession(
  repo: Repository,
  req: FastifyRequest,
): Promise<ResolvedSession> {
  const header = req.headers[DEVICE_TOKEN_HEADER];
  const existing = Array.isArray(header) ? header[0] : header;
  const deviceToken = existing && existing.trim() !== '' ? existing : randomUUID();
  const player = await repo.getOrCreatePlayerByToken(deviceToken);
  return { player, deviceToken, issued: !existing };
}
