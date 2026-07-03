# Database Migrations (P1-DATA-01)

## Tooling

A **zero-dependency SQL runner** (`server/src/db/migrate.ts`) over plain `.sql` files in
`server/migrations/`. No migration framework — the runner is ~120 lines, and `pg` is loaded via a
guarded (variable-specifier) dynamic import, so nothing enters the lockfile until the datastore is
activated. This matches the project's [guarded-integration] pattern used for Sentry/PostHog.

## File format

One file per migration, named `NNNN_name.sql` (the numeric prefix is the version and sort key). Each
file has an `-- UP` section and a `-- DOWN` section:

```sql
-- UP
CREATE TABLE example (...);

-- DOWN
DROP TABLE IF EXISTS example;
```

Applied versions are tracked in a `_migrations` table, so `up` only runs what's pending (idempotent)
and `down` rolls back the single most recent migration. Each migration runs in its own transaction.

## Commands

```bash
# from server/  (requires DATABASE_URL set and `npm i pg`)
npm run migrate            # apply all pending migrations (up)
npm run migrate -- down    # roll back the most recent migration
```

With no `DATABASE_URL`, the runner prints activation guidance and exits non-zero rather than crashing.

## Migrate-on-deploy policy

`npm run migrate` (up) runs on **every deploy, before** the API starts accepting traffic. Because it
only applies versions not yet in `_migrations`, re-running is always safe. Migrations must be
**backward-compatible with the currently-running server** (expand-then-contract): add columns/tables
first, deploy code that uses them, and only drop the old shape in a later migration. Never edit a
migration that has shipped — add a new one.

## P1 migrations

| Version | Table                                        | Task       |
| ------- | -------------------------------------------- | ---------- |
| 0001    | `player`                                     | P1-DATA-02 |
| 0002    | `trace` (+ `idx_trace_chunk`)                | P1-DATA-03 |
| 0003    | `chunk_state`                                | P1-DATA-04 |
| 0004    | `appreciation` (`UNIQUE(trace_id, from_id)`) | P1-DATA-05 |

[guarded-integration]: ../ 'see vault indication `guarded-optional-integration`'
