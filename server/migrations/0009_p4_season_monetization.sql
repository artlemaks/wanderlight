-- P4 — season + monetization + admin.
-- Adds the season/Trail-Pass + embers state to `player` (season_xp, pass_claimed, embers, kit_owned),
-- the `report` moderation queue, the `purchase` ledger (reconciled against the payment provider), and
-- the `ad_grant` daily-cap ledger for rewarded ads. All additive/defaulted — safe over existing rows.
--
-- Guardrail note (scope §9): `embers` is a DISTINCT column from `motes` — the two currencies are never
-- interchanged in a way that grants power; embers buy cosmetics only (all of which are also free-
-- earnable). No column here confers gameplay power.

-- UP
ALTER TABLE player ADD COLUMN embers integer NOT NULL DEFAULT 0;
ALTER TABLE player ADD COLUMN season_xp integer NOT NULL DEFAULT 0;
ALTER TABLE player ADD COLUMN pass_claimed jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE player ADD COLUMN kit_owned boolean NOT NULL DEFAULT false;

-- Moderation queue (P4-SRV-09). One row per report; status open→actioned|dismissed.
CREATE TABLE report (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id    uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'open',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_open ON report (status, created_at);

-- Real-money purchase ledger, reconciled daily against the provider (P4-SRV-06).
CREATE TABLE purchase (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        uuid NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  provider_ref     text NOT NULL UNIQUE,
  sku              text NOT NULL,
  amount_usd_cents integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchase_created ON purchase (created_at);

-- Rewarded-ad daily-cap ledger (P4-SRV-08): grants per player per UTC day bucket.
CREATE TABLE ad_grant (
  player_id  uuid NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  day_bucket bigint NOT NULL,
  count      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, day_bucket)
);

-- DOWN
DROP TABLE IF EXISTS ad_grant;
DROP TABLE IF EXISTS purchase;
DROP TABLE IF EXISTS report;
ALTER TABLE player DROP COLUMN IF EXISTS kit_owned;
ALTER TABLE player DROP COLUMN IF EXISTS pass_claimed;
ALTER TABLE player DROP COLUMN IF EXISTS season_xp;
ALTER TABLE player DROP COLUMN IF EXISTS embers;
