-- P3 — accounts + cosmetics + appreciation loop.
-- Adds the attunement counter + equipped-cosmetics slots to `player`, a unique index on email so the
-- anon→email upgrade / cross-device link resolves one account per address, and the
-- `appreciation_notice` feed that powers the return summary ("N travelers thanked your signpost").
-- All additive/defaulted so it is safe over existing P1/P2 rows. Ownership of attunement cosmetics is
-- derived in the app from `attunement` (see repo `toPlayer`), so no ownership backfill is needed.

-- UP
ALTER TABLE player ADD COLUMN attunement integer NOT NULL DEFAULT 0;
ALTER TABLE player ADD COLUMN equipped jsonb NOT NULL DEFAULT
  '{"cloak":"cloak.wanderer","glyph":"glyph.none","trail":"trail.none","lantern_color":"lantern.amber","signpost_frame":"frame.plain","gift_wrap":"wrap.simple"}'::jsonb;

-- One account per email (case-insensitive normalization happens in the app). Partial: anon rows are NULL.
CREATE UNIQUE INDEX idx_player_email ON player (email) WHERE email IS NOT NULL;

CREATE TABLE appreciation_notice (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  uuid NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  trace_id   uuid NOT NULL,
  trace_type text NOT NULL,
  seen       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The return flow reads an author's unseen notices, oldest-first.
CREATE INDEX idx_appreciation_notice_author ON appreciation_notice (author_id, seen, created_at);

-- DOWN
DROP TABLE IF EXISTS appreciation_notice;
DROP INDEX IF EXISTS idx_player_email;
ALTER TABLE player DROP COLUMN IF EXISTS equipped;
ALTER TABLE player DROP COLUMN IF EXISTS attunement;
