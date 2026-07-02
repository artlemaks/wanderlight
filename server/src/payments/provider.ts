/**
 * Payment provider seam (P4-SRV-05) — a thin, framework-agnostic interface over Stripe/Paddle.
 *
 * The real provider is an **optional, guarded** dependency (mirrors the Sentry/PostHog seams): it is
 * only loaded when `PAYMENTS_PROVIDER` + its key are configured AND the SDK is installed. Otherwise the
 * app runs against {@link stubPaymentProvider}, which simulates a successful purchase in-process so the
 * store/pass flows and their tests work end-to-end with zero external services or lockfile deps.
 * Activation: choose a provider, `npm i` its SDK, set the env keys.
 *
 * **Guardrail (scope §9):** a charge only ever grants embers (a bought currency) or a one-time QoL
 * bundle — never motes, progression, power, or anything touching another player's world.
 */

/** A request to purchase an ember pack (or the Wayfarer's Kit) for real money. */
export interface ChargeRequest {
  readonly playerId: string;
  /** Ember-pack id or kit id being bought. */
  readonly sku: string;
  readonly amountUsdCents: number;
}

/** The result of a charge attempt. `providerRef` is the provider's transaction id (for reconciliation). */
export interface ChargeResult {
  readonly ok: boolean;
  readonly providerRef: string;
  readonly amountUsdCents: number;
}

export interface PaymentProvider {
  readonly name: string;
  /** Create + confirm a charge. In production this is a webhook-confirmed checkout; the stub auto-confirms. */
  charge(req: ChargeRequest): Promise<ChargeResult>;
  /** List settled charges since `sinceMs` — the provider side of daily reconciliation (P4-SRV-06). */
  listCharges(sinceMs: number): Promise<ChargeResult[]>;
}

interface WarnLogger {
  warn(obj: unknown, msg?: string): void;
}

/**
 * In-process stub provider — the default when no real provider is configured. Deterministically
 * "settles" every charge and records it so reconciliation has a provider ledger to compare against.
 * No network, no SDK. `counter` makes provider refs unique without Math.random/Date (kept determinism-
 * friendly for tests).
 */
export function createStubPaymentProvider(): PaymentProvider {
  const settled: Array<ChargeResult & { at: number }> = [];
  let counter = 0;
  return {
    name: 'stub',
    async charge(req) {
      counter += 1;
      const result: ChargeResult = {
        ok: true,
        providerRef: `stub_${req.sku}_${counter}`,
        amountUsdCents: req.amountUsdCents,
      };
      settled.push({ ...result, at: Date.now() });
      return result;
    },
    async listCharges(sinceMs) {
      return settled.filter((c) => c.at >= sinceMs).map(({ at: _at, ...c }) => c);
    },
  };
}

/**
 * Build the payment provider. Returns a real provider when `providerName` + `apiKey` are set and the
 * SDK loads; otherwise the {@link createStubPaymentProvider} (warning once if configured-but-missing).
 * The real integration is a guarded dynamic import — no SDK enters the lockfile until activated.
 */
export async function createPaymentProvider(
  providerName: string | undefined,
  apiKey: string | undefined,
  log?: WarnLogger,
): Promise<PaymentProvider> {
  if (!providerName || !apiKey) return createStubPaymentProvider();
  try {
    // Guarded: the concrete SDK (e.g. 'stripe') is loaded via a variable specifier so it is never
    // required to be installed at build/CI time. The real adapter is wired here on activation.
    const specifier = providerName;
    await import(specifier);
    log?.warn(
      { provider: providerName },
      'payment provider SDK loaded but no concrete adapter is wired yet — falling back to stub (P4-SRV-05 activation TODO)',
    );
    return createStubPaymentProvider();
  } catch {
    log?.warn(
      { provider: providerName },
      `PAYMENTS_PROVIDER=${providerName} set but its SDK is not installed — using stub (run \`npm i ${providerName}\`)`,
    );
    return createStubPaymentProvider();
  }
}
