-- P1-DATA-04 — `chunk_state` table (denormalized per-chunk aggregates).
-- Upserted whenever a trace lands in a chunk so the chunk read can return warmth + counts without
-- scanning every trace. `footfall` is a jsonb bag for later footpath/warmth signals (P2).

-- UP
CREATE TABLE chunk_state (
  chunk_x      integer NOT NULL,
  chunk_y      integer NOT NULL,
  warmth       real NOT NULL DEFAULT 0,
  footfall     jsonb NOT NULL DEFAULT '{}'::jsonb,
  trace_count  integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chunk_x, chunk_y)
);

-- DOWN
DROP TABLE IF EXISTS chunk_state;
