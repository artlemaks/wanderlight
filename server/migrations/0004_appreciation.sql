-- P1-DATA-05 — `appreciation` table.
-- One row per (trace, appreciating player). The UNIQUE constraint makes appreciation idempotent at
-- the database level: a second "thanks" from the same player violates the constraint and is a no-op,
-- so an author can never be over-rewarded for one admirer (P1-SRV-07).

-- UP
CREATE TABLE appreciation (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id    uuid NOT NULL REFERENCES trace(id) ON DELETE CASCADE,
  from_id     uuid NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trace_id, from_id)
);

CREATE INDEX idx_appreciation_trace ON appreciation (trace_id);

-- DOWN
DROP TABLE IF EXISTS appreciation;
