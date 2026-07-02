-- P2.C — the traveler journal feed (P2-DATA-02) and mote-of-light collection idempotency (P2-CLI-05).
-- `journal_event` is an append-only personal history; `mote_collect` enforces one collect per player
-- per mote so the earn is not farmable by re-collecting the same mote.

-- UP
CREATE TABLE journal_event (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid NOT NULL REFERENCES player(id),
  kind       text NOT NULL,
  ref_id     text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The journal UI reads a player's most-recent events, newest first.
CREATE INDEX idx_journal_event_player ON journal_event (player_id, created_at DESC);

CREATE TABLE mote_collect (
  player_id  uuid NOT NULL REFERENCES player(id),
  mote_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, mote_id)
);

-- DOWN
DROP TABLE IF EXISTS mote_collect;
DROP TABLE IF EXISTS journal_event;
