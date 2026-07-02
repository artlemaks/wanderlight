import { describe, it, expect } from 'vitest';
import { reconcileLedgers } from './reconcile';

describe('reconcileLedgers', () => {
  it('reports zero discrepancies when ledgers match (P4-TST-02)', () => {
    const provider = [
      { providerRef: 'a', amountUsdCents: 199 },
      { providerRef: 'b', amountUsdCents: 499 },
    ];
    const db = [
      { providerRef: 'a', amountUsdCents: 199 },
      { providerRef: 'b', amountUsdCents: 499 },
    ];
    const report = reconcileLedgers(provider, db);
    expect(report.discrepancies).toHaveLength(0);
    expect(report.providerCount).toBe(2);
    expect(report.dbCount).toBe(2);
  });

  it('flags a charge present at the provider but missing in the DB', () => {
    const report = reconcileLedgers([{ providerRef: 'a', amountUsdCents: 199 }], []);
    expect(report.discrepancies).toEqual([
      { providerRef: 'a', kind: 'missing_in_db', providerAmount: 199, dbAmount: null },
    ]);
  });

  it('flags a DB record with no matching provider charge', () => {
    const report = reconcileLedgers([], [{ providerRef: 'z', amountUsdCents: 699 }]);
    expect(report.discrepancies[0]).toMatchObject({
      providerRef: 'z',
      kind: 'missing_in_provider',
    });
  });

  it('flags amount mismatches', () => {
    const report = reconcileLedgers(
      [{ providerRef: 'a', amountUsdCents: 199 }],
      [{ providerRef: 'a', amountUsdCents: 299 }],
    );
    expect(report.discrepancies[0]).toMatchObject({
      kind: 'amount_mismatch',
      providerAmount: 199,
      dbAmount: 299,
    });
  });
});
