-- P1-DATA-03 — `trace` table + spatial index.
-- The core artifact: a mark left in the world at world-tile (x, y). `chunk_x`/`chunk_y` are derived
-- server-side from (x, y) and stored denormalized so the hot read — "give me the traces in these
-- chunks" — is a single indexed range scan (see idx_trace_chunk). `payload` holds the type-specific
-- body (signpost template+slots, lantern). `warmth`/`appreciations` are prioritization signals.

-- UP
CREATE TABLE trace (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text NOT NULL,
  chunk_x        integer NOT NULL,
  chunk_y        integer NOT NULL,
  x              double precision NOT NULL,
  y              double precision NOT NULL,
  author_id      uuid NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  warmth         real NOT NULL DEFAULT 0,
  appreciations  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz
);

-- The chunk read (GET /world/chunks) filters by (chunk_x, chunk_y); this index makes it a range scan.
CREATE INDEX idx_trace_chunk ON trace (chunk_x, chunk_y);

-- DOWN
DROP TABLE IF EXISTS trace;
