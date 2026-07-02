-- P2.B — raw movement-heat sample buffer (P2-CLI-02 → P2-SRV-03).
-- Clients batch-send low-resolution footpath tiles here; the footpath aggregation job folds
-- unaggregated rows into `chunk_state.footfall` (the jsonb column reserved for this in 0003) and
-- raises chunk warmth, then marks them aggregated. `idx_heat_sample_pending` keeps the job's scan of
-- outstanding samples cheap.

-- UP
CREATE TABLE heat_sample (
  id         bigserial PRIMARY KEY,
  tx         integer NOT NULL,
  ty         integer NOT NULL,
  aggregated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_heat_sample_pending ON heat_sample (id) WHERE aggregated = false;

-- DOWN
DROP TABLE IF EXISTS heat_sample;
