-- P1-DATA-02 — `player` table.
-- An account is anonymous-first: a device token identifies a returning visitor; email is optional
-- (added when they upgrade in P3). `motes` is the earn-by-play soft currency; `cosmetics_owned` and
-- `pass_tier` are placeholders the later phases (P3/P4) build on.

-- UP
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE player (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token     text NOT NULL UNIQUE,
  email            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  motes            integer NOT NULL DEFAULT 0,
  cosmetics_owned  jsonb NOT NULL DEFAULT '[]'::jsonb,
  pass_tier        text NOT NULL DEFAULT 'free'
);

-- DOWN
DROP TABLE IF EXISTS player;
