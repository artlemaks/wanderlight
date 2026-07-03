/**
 * Account upgrade + cross-device linking contracts (P3-SRV-01/02/03).
 *
 * An account starts anonymous (device token). Upgrading attaches an email so the *same* player —
 * motes, cosmetics, journal, everything — can be reached from another device. The anon path is never
 * removed; email is purely additive. Signing in on a second device with the same email links it to the
 * existing account (the device token is re-pointed), so there is one consistent account per email.
 *
 * Pure shapes + a conservative email check; the server owns the data-preserving swap.
 */

/** `POST /auth/upgrade` — attach an email to the calling anonymous account (or link to an existing one). */
export interface UpgradeRequest {
  readonly email: string;
}

/** `POST /auth/upgrade` response — the (possibly linked) player's id + email + balances. */
export interface UpgradeResponse {
  readonly playerId: string;
  readonly email: string;
  readonly motes: number;
  /** True when the email already had an account and this device was linked to it (not a fresh upgrade). */
  readonly linked: boolean;
}

/**
 * Conservative email validation for the upgrade boundary. Deliberately simple — a single `@` with a
 * dotted domain and no whitespace — because the point is to reject obvious garbage, not to police
 * RFC 5322. Real deliverability is confirmed by the (P4) email digest opt-in, not here.
 */
export function isValidEmail(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const email = v.trim();
  if (email.length === 0 || email.length > 254) return false;
  if (/\s/.test(email)) return false;
  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@')) return false;
  const domain = email.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

/** Normalize an email for storage/lookup (trim + lowercase) so linking is case-insensitive. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
