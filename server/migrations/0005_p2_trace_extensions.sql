-- P2.A — additive trace state for the full trace set (gift / shrine / lantern lit-count) and the
-- system-authored seed flag. Mirrors the fields added to the `Trace`/`Player` application shapes in
-- `@wanderlight/shared` and `server/src/repo/types.ts`. All columns are nullable or defaulted so the
-- migration is safe over existing P1 rows.

-- UP
ALTER TABLE player ADD COLUMN gift_charges integer NOT NULL DEFAULT 3;

ALTER TABLE trace ADD COLUMN lit_count integer NOT NULL DEFAULT 0;
ALTER TABLE trace ADD COLUMN claimed_by uuid NULL REFERENCES player(id);
ALTER TABLE trace ADD COLUMN claimed_at timestamptz NULL;
ALTER TABLE trace ADD COLUMN system_authored boolean NOT NULL DEFAULT false;

-- Idempotency ledger for lantern lighting: one lighting per (lantern, player), like appreciation.
CREATE TABLE lantern_lit (
  trace_id   uuid NOT NULL REFERENCES trace(id) ON DELETE CASCADE,
  from_id    uuid NOT NULL REFERENCES player(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trace_id, from_id)
);

-- Shared, growing shrine structures, one per chunk landmark. Offerings accumulate (repeatable).
CREATE TABLE shrine (
  chunk_x    integer NOT NULL,
  chunk_y    integer NOT NULL,
  offerings  integer NOT NULL DEFAULT 0,
  warmth     real NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chunk_x, chunk_y)
);

-- DOWN
DROP TABLE IF EXISTS shrine;
DROP TABLE IF EXISTS lantern_lit;
ALTER TABLE trace DROP COLUMN IF EXISTS system_authored;
ALTER TABLE trace DROP COLUMN IF EXISTS claimed_at;
ALTER TABLE trace DROP COLUMN IF EXISTS claimed_by;
ALTER TABLE trace DROP COLUMN IF EXISTS lit_count;
ALTER TABLE player DROP COLUMN IF EXISTS gift_charges;
