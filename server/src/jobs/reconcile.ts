/**
 * Payment reconciliation job (P4-SRV-06).
 *
 * Daily balance verification: compare the payment provider's settled charges against our own
 * `purchase` ledger and flag any discrepancies (present in one but not the other, or amount mismatch).
 * Pure comparison over the two ledgers so it is fully unit-tested; the scheduler calls it on a timer.
 *
 * **Guardrail §9:** reconciliation touches only bought embers/cosmetics (the `purchase` ledger); it
 * never inspects or adjusts earned motes/progression.
 */

import type { PaymentProvider } from '../payments/provider';
import type { PurchaseRecord, Repository } from '../repo/types';
import type { Job, JobLogger } from './scheduler';

/** Default interval between reconciliation runs (ms). Daily — settlement is not real-time. */
export const RECONCILE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Wrap reconciliation as a schedulable {@link Job}, reconciling the last {@link RECONCILE_INTERVAL_MS}. */
export function createReconciliationJob(
  repo: Repository,
  payments: PaymentProvider,
  logger?: JobLogger,
): Job {
  return {
    name: 'payment-reconciliation',
    async run(now) {
      return runReconciliation(repo, payments, now, RECONCILE_INTERVAL_MS, logger);
    },
  };
}

export interface ReconcileDiscrepancy {
  readonly providerRef: string;
  readonly kind: 'missing_in_db' | 'missing_in_provider' | 'amount_mismatch';
  readonly providerAmount: number | null;
  readonly dbAmount: number | null;
}

export interface ReconcileReport {
  readonly providerCount: number;
  readonly dbCount: number;
  readonly discrepancies: readonly ReconcileDiscrepancy[];
}

/** Compare two ledgers by provider ref + amount. Pure — the core of the reconciliation job. */
export function reconcileLedgers(
  providerCharges: ReadonlyArray<{ providerRef: string; amountUsdCents: number }>,
  dbRecords: readonly PurchaseRecord[],
): ReconcileReport {
  const byProvider = new Map(providerCharges.map((c) => [c.providerRef, c.amountUsdCents]));
  const byDb = new Map(dbRecords.map((r) => [r.providerRef, r.amountUsdCents]));
  const discrepancies: ReconcileDiscrepancy[] = [];

  for (const [ref, amount] of byProvider) {
    if (!byDb.has(ref)) {
      discrepancies.push({
        providerRef: ref,
        kind: 'missing_in_db',
        providerAmount: amount,
        dbAmount: null,
      });
    } else if (byDb.get(ref) !== amount) {
      discrepancies.push({
        providerRef: ref,
        kind: 'amount_mismatch',
        providerAmount: amount,
        dbAmount: byDb.get(ref)!,
      });
    }
  }
  for (const [ref, amount] of byDb) {
    if (!byProvider.has(ref)) {
      discrepancies.push({
        providerRef: ref,
        kind: 'missing_in_provider',
        providerAmount: null,
        dbAmount: amount,
      });
    }
  }
  return { providerCount: byProvider.size, dbCount: byDb.size, discrepancies };
}

/** Run reconciliation over the last `windowMs` and return the report (logging discrepancies). */
export async function runReconciliation(
  repo: Repository,
  payments: PaymentProvider,
  now: number,
  windowMs: number,
  log?: JobLogger,
): Promise<ReconcileReport> {
  const since = now - windowMs;
  const [providerCharges, dbRecords] = await Promise.all([
    payments.listCharges(since),
    repo.getPurchaseLedger(since),
  ]);
  const report = reconcileLedgers(providerCharges, dbRecords);
  if (report.discrepancies.length > 0) {
    log?.error(
      { discrepancies: report.discrepancies },
      'payment reconciliation found discrepancies',
    );
  } else {
    log?.info(
      { providerCount: report.providerCount, dbCount: report.dbCount },
      'payment reconciliation clean',
    );
  }
  return report;
}
