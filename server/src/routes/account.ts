/**
 * Account upgrade route (P3-SRV-02/03).
 *
 * `POST /auth/upgrade` attaches an email to the calling anonymous account (data-preserving) or, when
 * the email already exists, links this device to that canonical account. The anon device-token path is
 * untouched — email is purely additive.
 */

import type { FastifyInstance } from 'fastify';
import { isValidEmail, normalizeEmail, type UpgradeResponse } from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { resolveSession, DEVICE_TOKEN_HEADER } from '../session';

export function registerAccountRoutes(app: FastifyInstance, repo: Repository): void {
  app.post<{ Body: { email?: string } }>('/auth/upgrade', async (req, reply) => {
    const { player, deviceToken } = await resolveSession(repo, req);
    reply.header(DEVICE_TOKEN_HEADER, deviceToken);

    const email = req.body?.email;
    if (!isValidEmail(email)) {
      return reply
        .status(400)
        .send({ error: 'invalid_email', message: 'A valid email is required' });
    }
    const { player: result, linked } = await repo.upgradePlayerToEmail(
      player.id,
      normalizeEmail(email),
    );
    const body: UpgradeResponse = {
      playerId: result.id,
      email: result.email ?? normalizeEmail(email),
      motes: result.motes,
      linked,
    };
    return body;
  });
}
