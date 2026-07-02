# Launch Runbooks — P6.B (P6-OPS-01/02/03/04)

> Operational runbooks for the soft launch. Backup/restore + live-ops rehearsals are **procedures to
> run** against a deployed environment; the density audit is backed by tested code
> (`server/src/ops/densityAudit.ts`).

## P6-OPS-01 — Backup / restore

**AC:** restore from a 1-week-old snapshot in < 1 hr, rehearsed.

1. **Backups:** managed Postgres (Neon/Supabase) automated daily snapshots + PITR enabled. Verify
   retention ≥ 8 days (covers the 1-week restore target).
2. **Restore drill (rehearse before launch):**
   - Provision a scratch instance from a ~1-week-old snapshot.
   - Run `migrate up` (migrate-on-deploy policy, `docs/Migrations.md`) — idempotent, applies nothing
     new on an already-current snapshot.
   - Smoke-test: `/health` 200, a chunk read returns seeded traces, a session bootstraps.
   - Record wall-clock; must be < 1 hr end-to-end.
3. **Runbook location:** keep the exact provider commands in `infra/` once the provider is chosen.

## P6-OPS-02 — Live-ops dry run

**AC:** season rotation + tuning proven in staging without a code deploy.

- Rotate a season: configure the next `Season` (`shared/season.ts`) + `PASS_TRACKS`; confirm XP accrues
  and tiers/claims work (covered by `p4.integration.test.ts`).
- Tune caps without deploy: density cap / rate limits (`shared/economy.ts` `RATE_LIMITS`) and GC cadence
  are config/constants — confirm they can be adjusted via env/config, not code.
- Seed events: run `npm run seed:world` against staging; confirm cold-start test stays green.

## P6-OPS-03 — Post-beta density audit

**AC:** no chunk below target density; else trigger a P5-CNT-05-style top-up.

- Feed `chunk_state.trace_count` (or a `getChunkTraces` sweep of visited chunks) into
  `auditDensity(countsByChunk)`.
- `report.pass === false` → author `+N` seed traces for `report.thinChunks` (the ascending work list),
  re-seed, re-audit until pass. Unit-tested in `ops/densityAudit.test.ts`.

## P6-OPS-04 — Marketing beats

**AC:** shareable moments produce clips/screens; PR hook ready.

- Capture hooks around the emotionally-resonant moments already instrumented: receiving an appreciation
  (return summary), a shrine milestone, a lantern first-light, a warm/worn footpath forming.
- Each maps to an existing client surface (return summary UI, shrine state, warmth overlay) — wire a
  "capture this moment" screenshot/clip affordance; feed the unique-hook PR narrative (scope §14
  discovery risk).
