# Chunk Query Strategy (P1-SRV-03)

The read algorithm behind `GET /world/chunks?ids=` — how many traces a chunk returns, in what
priority, and the index plan that keeps it fast. Implemented by `prioritizeTraces` in
`@wanderlight/shared` (unit-tested) and consumed by both repo implementations.

## Density cap

Each chunk returns at most **`MAX_TRACES_PER_CHUNK` = 24** traces, regardless of how many exist. This
keeps a crowded chunk legible on screen and bounds read latency and payload size. The cap is applied
_after_ prioritization, so a chunk always shows its 24 best traces, never an arbitrary 24.

## Prioritization

Each trace gets a scalar priority score at read time (`tracePriority`):

```
priority = freshness + APPRECIATION_WEIGHT · appreciations + WARMTH_WEIGHT · warmth
```

- **Freshness** — exponential decay `2^(-age / halfLife)`, half-life **7 days**. A brand-new trace
  scores ~1.0; a week-old one ~0.5. Keeps the world feeling alive without hard cutoffs.
- **Appreciation** (weight 3) — community-validated traces surface above noise. This is the strongest
  signal, so a couple of appreciations outranks pure freshness.
- **Warmth / light** (weight 1) — lanterns and warm chunks get a gentle lift, reinforcing the cozy
  loop.

Weights live in `PRIORITY_WEIGHTS` and are tuned in P1; changing them is a content/design call, not a
schema change.

## Tie-breaks (determinism)

Equal priority → newer `createdAt` first → lexicographically smaller `id`. Fully deterministic, so
every client viewing the same chunk at the same instant sees the same ordering. No random tie-breaks.

## Index plan

- `idx_trace_chunk (chunk_x, chunk_y)` (migration 0002) turns the per-chunk read into a range scan.
  `EXPLAIN` on `SELECT … WHERE chunk_x = $1 AND chunk_y = $2` uses this index.
- Prioritization + capping run in application code (`prioritizeTraces`) rather than SQL for P1: chunk
  cardinality is small (tens of traces) so sorting in-app is cheap and keeps the two repo
  implementations identical. If a chunk's trace count ever grows large enough to matter, push the
  cap into SQL via `ORDER BY … LIMIT` with a computed-priority expression or a materialized column.

## Acceptance (P1-SRV-04)

- Returns capped, prioritized rows within the cap ✅ (`prioritizeTraces` + `loop.integration.test.ts`).
- p95 < 150ms at seed data — to be measured once a Postgres instance + seed corpus exist (P2-SRV-08);
  the index makes the query a bounded range scan, so this is expected to hold.
