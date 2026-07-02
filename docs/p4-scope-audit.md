# P4 Review Gate + **Guardrail Compliance Audit** — P4-GOV-01

> Applies the review-gate process to the P4 slice (season + monetization + admin). **Human sign-off
> pending.** P4's gate is special: it **explicitly verifies every monetization AC cites scope §9 and
> holds** — a guardrail violation blocks merge.

## Delivered (code + tests green in CI)

| Epic                           | Tasks                               | Evidence                                                                                                                   |
| ------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| P4.A season + Trail Pass       | P4-DATA-01, P4-SRV-01/02, P4-CLI-01 | `season.ts` (shared), `routes/pass.ts`, `pass/service.ts`; free+premium claim tests                                        |
| P4.B store + embers            | P4-DATA-02, P4-SRV-03/04, P4-CLI-02 | `store.ts` (shared), `routes/store.ts`, `store/service.ts`; buy-embers + purchase + dup tests                              |
| P4.C payments + reconciliation | P4-SRV-05/06/07                     | `payments/provider.ts` (guarded stub + real seam), `jobs/reconcile.ts`; clean-reconcile + mismatch tests                   |
| P4.D rewarded ads              | P4-SRV-08, P4-CLI-03                | `ads.ts` (shared), `routes/ads.ts`; opt-in + daily-cap tests                                                               |
| P4.E admin/moderation/abuse    | P4-DATA-03, P4-SRV-09/10, P4-OPS-01 | `moderation.ts`, `routes/report.ts`, `routes/admin.ts` (fail-closed), `security/pow.ts`; report→remove + authz + PoW tests |
| P4.F perf/analytics/tests/gov  | P4-TST-02/03, P4-ANL-01, P4-GOV-01  | `p4.integration.test.ts`, `reconcile.test.ts`, `pow.test.ts`; this doc                                                     |

## Guardrail compliance matrix (scope §9 — every row is asserted by a test)

| Guardrail                                | How it holds                                                                                                       | Test                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Motes (earned) ≠ embers (bought)         | Distinct `embers` column + currency; no code path converts one to the other                                        | migration `0009`; `store.test.ts`                |
| Nothing purchasable grants power         | Pass rewards are `cosmetic \| mote_boost` only; store sells cosmetics; ads grant motes/charges; kit is QoL         | `season.test.ts`, `store.test.ts`, `ads.test.ts` |
| Every cosmetic free-earnable             | Store + pass cosmetic ids are all `COSMETICS` catalog items (attunement-earnable); `isStoreItemFreeEarnable` guard | `store.test.ts`, `season.test.ts`                |
| Premium lane not the sole path           | Premium-lane cosmetics also on attunement track; free lane always claimable by play                                | `season.test.ts`; `p4.integration.test.ts`       |
| Real-money prices in $1.99–$6.99         | `PRICE_BAND_USD_CENTS` + service band-check                                                                        | `store.test.ts`                                  |
| Ads opt-in, capped, never interstitial   | `/ads/reward` requires `verified:true` (player-initiated); `REWARDED_AD_DAILY_CAP`                                 | `p4.integration.test.ts`                         |
| Reconciliation touches only bought items | Reconciles the `purchase` ledger only; never motes/progression                                                     | `reconcile.test.ts`                              |
| Admin surface fail-closed                | `/admin/*` unregistered without `ADMIN_TOKEN`; 401 on bad token                                                    | `p4.integration.test.ts`                         |

## P4-CNT-01 — seed density interim top-up

The P3 corpus (`content/seed-traces.json`, 45 traces) already covers the 3×3 First Vale block with the
season shrine at the origin landmark; the density audit test proves ≥1 seed per visited chunk. The
themed-shrine top-up is therefore satisfied by the existing corpus for the single-region MVP; a further
+N pass is only triggered if the P6 density audit (`P6-OPS-03`) finds thin chunks. **Awaiting director
sign-off** on season-area tone alongside the corpus.

## Payments activation note (not self-granted)

`payments/provider.ts` ships the **guarded stub** — no real provider, no SDK in the lockfile. Real
Stripe/Paddle wiring (concrete adapter + webhooks) is an activation step requiring the provider account

- keys; the reconciliation job + tests are ready for it. This mirrors the Sentry/PostHog seams.

## Reviewer sign-off

- [ ] Artur — verify every monetization AC cites §9 and holds (matrix above)
- [ ] Artur — approve price bands + season reward cadence
- [ ] Confirm no out-of-scope items; log any to §5.G
