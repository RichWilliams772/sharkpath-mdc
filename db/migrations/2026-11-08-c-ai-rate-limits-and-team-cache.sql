-- AI routes: per-visitor rate limits, and cached Counselor Team reports.
-- Run after the other 2026-11-08 migrations. Safe to re-run.

BEGIN;

-- One row per visitor per route per time window. `bucket` is a SHA-256 hash of
-- route + IP address, so no raw IP addresses are stored. Old rows are pruned by the app.
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  bucket        TEXT        NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INT         NOT NULL,
  PRIMARY KEY (bucket, window_start)
);

-- Finished Counselor Team reports, reused for the same career + route + language.
-- `facts_hash` covers the career's facts and the prompts, so any data or prompt change
-- makes the old report stale and it is regenerated on the next view.
CREATE TABLE IF NOT EXISTS counselor_team_cache (
  career_id   TEXT        NOT NULL,
  route_id    TEXT        NOT NULL,
  locale      TEXT        NOT NULL CHECK (locale IN ('en', 'es')),
  facts_hash  TEXT        NOT NULL,
  agents      JSONB       NOT NULL,   -- AgentReport[]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (career_id, route_id, locale)
);

COMMIT;
