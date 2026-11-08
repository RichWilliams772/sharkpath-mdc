-- SharkPath schema for Tiger Data (Postgres). Mirrors src/types/roadmap.ts.
--
-- Conventions
--   * A `Sourced<T>` field becomes three columns: <name>_value, <name>_unit, <name>_source_id.
--   * String-literal unions become TEXT + CHECK (easier to extend than Postgres ENUMs).
--   * `position` columns keep the array order from the TS types (courses, routes, stages).
--
-- Run: psql "$DATABASE_URL" -f db/schema.sql   (safe to re-run; drops and recreates)

BEGIN;

DROP TABLE IF EXISTS saved_plans, deadline_careers, deadlines, schools, career_notes, pathway_routes,
  pathway_stages, careers, program_courses, programs, sources CASCADE;

-- ─── Sources ────────────────────────────────────────────────────────────────
CREATE TABLE sources (
  id        TEXT PRIMARY KEY,
  label     TEXT NOT NULL,              -- chip label, e.g. "BLS OOH"
  title     TEXT NOT NULL,              -- full citation
  url       TEXT NOT NULL,
  as_of     TEXT,                       -- data period, e.g. "May 2024"
  verified  BOOLEAN NOT NULL DEFAULT FALSE,
  checked_on DATE                        -- when someone confirmed the figure is written at `url`
);

-- ─── Programs & courses ─────────────────────────────────────────────────────
CREATE TABLE programs (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  degree                   TEXT NOT NULL CHECK (degree IN ('A.A.', 'A.S.', 'B.S.', 'B.A.S.')),
  school                   TEXT NOT NULL,
  total_credits_value      NUMERIC NOT NULL,
  total_credits_unit       TEXT,
  total_credits_source_id  TEXT NOT NULL REFERENCES sources(id)
);

-- Courses belong to a program (the same code can differ by program, e.g. CGS2940 internship credits).
CREATE TABLE program_courses (
  program_id  TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  position    INT  NOT NULL,            -- recommended order
  code        TEXT NOT NULL,
  title       TEXT NOT NULL,
  credits     NUMERIC NOT NULL CHECK (credits > 0),
  category    TEXT NOT NULL CHECK (category IN ('general-education', 'program-core', 'elective')),
  PRIMARY KEY (program_id, position),
  UNIQUE (program_id, code)
);

-- ─── Careers ────────────────────────────────────────────────────────────────
CREATE TABLE careers (
  id           TEXT PRIMARY KEY,        -- slug, e.g. "registered-nurse"
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL,
  origin       TEXT NOT NULL CHECK (origin IN ('verified', 'catalog', 'ai')),
  meta_major   TEXT NOT NULL CHECK (meta_major IN
                 ('arts', 'business', 'education', 'health', 'industry', 'public-safety', 'stem', 'social')),
  track        TEXT NOT NULL CHECK (track IN ('as', 'transfer', 'graduate', 'certificate')),
  aliases      TEXT[] NOT NULL DEFAULT '{}',
  traits       TEXT[] NOT NULL DEFAULT '{}' CHECK (traits <@ ARRAY
                 ['building', 'designing', 'analyzing', 'helping', 'creating', 'organizing', 'hands-on', 'tech']),

  median_pay_value       NUMERIC NOT NULL,
  median_pay_unit        TEXT,
  median_pay_source_id   TEXT NOT NULL REFERENCES sources(id),

  job_growth_value       NUMERIC NOT NULL,
  job_growth_unit        TEXT,
  job_growth_source_id   TEXT NOT NULL REFERENCES sources(id),

  entry_pay_value        NUMERIC NOT NULL,
  entry_pay_unit         TEXT,
  entry_pay_source_id    TEXT NOT NULL REFERENCES sources(id),

  typical_entry_education_value      TEXT NOT NULL,
  typical_entry_education_source_id  TEXT NOT NULL REFERENCES sources(id),

  -- optional License (all three set, or none)
  license_name  TEXT,
  license_body  TEXT,
  license_url   TEXT,
  CHECK ((license_name IS NULL) = (license_body IS NULL) AND (license_name IS NULL) = (license_url IS NULL)),

  program_id    TEXT NOT NULL REFERENCES programs(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX careers_aliases_idx ON careers USING GIN (aliases);
CREATE INDEX careers_meta_major_idx ON careers (meta_major);

-- A career's stages (excluding "start" and the `career-<id>` node).
-- Keyed per career so each career stays self-contained, like the TS Career type.
CREATE TABLE pathway_stages (
  career_id     TEXT NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  id            TEXT NOT NULL,
  position      INT  NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN
                  ('start', 'mdc', 'transfer', 'graduate', 'training', 'certification', 'exam', 'career')),
  title         TEXT NOT NULL,
  subtitle      TEXT,
  column_hint   INT,                    -- PathwayStage.column

  years_value      NUMERIC,
  years_unit       TEXT,
  years_source_id  TEXT REFERENCES sources(id),

  fee_value        NUMERIC,
  fee_unit         TEXT,
  fee_source_id    TEXT REFERENCES sources(id),

  earning_while_in_stage BOOLEAN,
  after_first_job        BOOLEAN,       -- career-growth step after the first job (FE → PE)
  at_start_school        BOOLEAN,       -- bachelor's at the starting college (MDC B.S.)
  PRIMARY KEY (career_id, id),
  CHECK ((years_value IS NULL) = (years_source_id IS NULL)),
  CHECK ((fee_value IS NULL) = (fee_source_id IS NULL))
);

CREATE TABLE pathway_routes (
  career_id           TEXT NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  id                  TEXT NOT NULL,
  position            INT  NOT NULL,
  label               TEXT NOT NULL,
  -- ordered: 'start', the career's own stage ids, then 'career-<career_id>'
  stage_ids           TEXT[] NOT NULL,
  requires_bachelors  BOOLEAN NOT NULL,
  PRIMARY KEY (career_id, id),
  UNIQUE (id)
);

-- Career.notes: sourced things a student should know about the path.
CREATE TABLE career_notes (
  career_id  TEXT NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  position   INT  NOT NULL,
  text       TEXT NOT NULL,
  source_id  TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY (career_id, position)
);

-- ─── Schools ────────────────────────────────────────────────────────────────
CREATE TABLE schools (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  short_name  TEXT NOT NULL,
  state       CHAR(2) NOT NULL,
  city        TEXT,
  kind        TEXT NOT NULL CHECK (kind IN ('community', 'university')),

  tuition_in_state_value       NUMERIC NOT NULL,
  tuition_in_state_unit        TEXT,
  tuition_in_state_source_id   TEXT NOT NULL REFERENCES sources(id),

  tuition_out_state_value      NUMERIC NOT NULL,
  tuition_out_state_unit       TEXT,
  tuition_out_state_source_id  TEXT NOT NULL REFERENCES sources(id),

  -- the college's own bachelor's programs (e.g. MDC B.S.), if any
  bachelor_tuition_in_state_value       NUMERIC,
  bachelor_tuition_in_state_unit        TEXT,
  bachelor_tuition_in_state_source_id   TEXT REFERENCES sources(id),
  bachelor_tuition_out_state_value      NUMERIC,
  bachelor_tuition_out_state_unit       TEXT,
  bachelor_tuition_out_state_source_id  TEXT REFERENCES sources(id),

  custom      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX schools_state_idx ON schools (state);

-- ─── Deadlines ──────────────────────────────────────────────────────────────
CREATE TABLE deadlines (
  id           TEXT PRIMARY KEY,
  date         DATE NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN
                 ('financial-aid', 'admissions', 'registration', 'exam', 'scholarship')),
  source_id    TEXT NOT NULL REFERENCES sources(id)
);

-- Deadline.careerIds. No rows for a deadline = relevant to every career.
CREATE TABLE deadline_careers (
  deadline_id  TEXT NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
  career_id    TEXT NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  PRIMARY KEY (deadline_id, career_id)
);

-- ─── Saved plans ────────────────────────────────────────────────────────────
CREATE TABLE saved_plans (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  owner_id    TEXT NOT NULL,            -- Auth0 `sub`, or 'guest'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  inputs      JSONB NOT NULL,           -- WhatIfInputs
  career      JSONB,                    -- full Career, for AI-generated careers
  summary_years_to_career  NUMERIC NOT NULL,
  summary_net_cost         NUMERIC NOT NULL,
  summary_break_even_year  INT
);

CREATE INDEX saved_plans_owner_idx ON saved_plans (owner_id, created_at DESC);

COMMIT;
