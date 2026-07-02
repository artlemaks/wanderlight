# Load-Test Scenarios & Performance Targets — P4-TST-01 / P5-TST-01

> Performance targets (agreed) + repeatable load scenarios. The in-repo micro-benchmark
> (`server/src/perf/density.perf.test.ts`) asserts the chunk-read budget in CI; the k6/Artillery
> scenarios below are the full external load suite run against a deployed environment in P5-TST-01.

## Targets (scope §12 + breakdown P4-TST-01)

| Metric                             | Target                                                 | Where enforced                                             |
| ---------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| Max traces per chunk (visible cap) | density cap (P2-SRV-06)                                | `prioritizeTraces` + `density.perf.test.ts`                |
| Chunk read at max density          | **p95 < 150ms** (P1) / **< 500ms** at max density (P2) | `density.perf.test.ts` (in-proc), k6 scenario A (deployed) |
| Client FPS                         | 60fps laptop; ≥30fps floor                             | manual + P5-CLI-04 pass                                    |
| Target CCU (MVP beta)              | ~100 concurrent (P5-TST-03)                            | k6 scenario C                                              |
| GC / jobs                          | no lag spikes; within perf budget                      | `jobs/*` logging + scenario B                              |

## Scenarios (k6 / Artillery — committed under `infra/` on activation)

- **A — Chunk-read hot path:** ramp to target CCU issuing `GET /world/chunks` for a moving camera's
  visible set. Assert p95 latency < budget; error rate 0.
- **B — Write mix under jobs:** sustained `POST /trace` + `POST /heat` while footpath aggregation +
  fade/GC run. Assert no latency spike coincident with job runs (jobs are unref'd interval timers).
- **C — Cold-start + moderation load (P5-TST-03):** 100 simulated players placing curated traces at a
  high rate. Assert (a) zero moderation incidents — curated text has no free-text path (proven in
  `coldstart.integration.test.ts`), (b) bot gates (`security/pow.ts`) accept legit traffic.
- **D — Monetization path:** store/pass/purchase mix against the stub provider; assert reconciliation
  (`jobs/reconcile.ts`) runs clean.

## Status

- In-process budget assertions: **green in CI** (`density.perf.test.ts`, `coldstart.integration.test.ts`).
- External k6 suite: scenarios specified here; execution is a deployed-environment step (P5-TST-01),
  pending an environment to run against.
