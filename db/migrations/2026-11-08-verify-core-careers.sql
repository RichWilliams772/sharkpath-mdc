-- Verified figures for the 5 core careers + MDC tuition, checked 2026-11-08.
-- Run after db/schema.sql, db/seed.sql and db/seed-catalog.sql. Safe to re-run.
--
-- Rule: verified = TRUE only where the number is written on the page at `url`.
-- Figures that share an older source but were NOT confirmed (stage years, credits,
-- deadlines, entry pay) keep that source, so they stay unverified.

BEGIN;

-- Works on databases created before these existed (db/schema.sql now includes both).
ALTER TABLE sources ADD COLUMN IF NOT EXISTS checked_on DATE;
CREATE TABLE IF NOT EXISTS career_notes (
  career_id  TEXT NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
  position   INT  NOT NULL,
  text       TEXT NOT NULL,
  source_id  TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY (career_id, position)
);

-- ── Sources ────────────────────────────────────────────────────────────────
-- BLS pages: every figure citing them was confirmed, so update in place.
UPDATE sources SET as_of = 'May 2025', verified = TRUE, checked_on = DATE '2026-11-08'
WHERE id IN ('bls-architects', 'bls-chefs', 'bls-civil', 'bls-infosec', 'bls-software');

-- PE (civil): both its figures (fee, 4 years' experience) confirmed on the civil page.
UPDATE sources SET title = 'NCEES — PE Civil exam (fee and work experience)',
  url = 'https://ncees.org/exams/pe-exam/civil/', verified = TRUE, checked_on = DATE '2026-11-08'
WHERE id = 'ncees-pe';

-- New rows for confirmed figures whose old source is shared with unconfirmed ones.
INSERT INTO sources (id, label, title, url, as_of, verified, checked_on) VALUES
  ('ncarb-fees', 'NCARB', 'NCARB fees — ARE total cost (six divisions)', 'https://www.ncarb.org/fees', NULL, TRUE, DATE '2026-11-08'),
  ('ncees-fe-fee', 'NCEES', 'NCEES — FE exam fee', 'https://ncees.org/exams/fe-exam/', NULL, TRUE, DATE '2026-11-08'),
  ('servsafe-manager-price', 'ServSafe', 'ServSafe Manager Online Course & Exam (Online Proctor) price', 'https://www.servsafe.com/access/ss/Catalog/ProductList/10', NULL, TRUE, DATE '2026-11-08'),
  ('mdc-culinary-as', 'MDC', 'MDC — Culinary Arts Management Associate in Science (two-year program)', 'https://www.mdc.edu/culinaryartsmanagement/', NULL, TRUE, DATE '2026-11-08'),
  ('mdc-entec-as', 'MDC', 'MDC School of Engineering & Technology — 2-year Associate in Science degrees', 'https://www.mdc.edu/entec/programs.aspx', NULL, TRUE, DATE '2026-11-08'),
  ('mdc-tuition-per-credit', 'MDC', 'MDC tuition & fees — Associate programs, total cost per credit', 'http://www.mdc.edu/student-financial-services/tuition-fees/', NULL, TRUE, DATE '2026-11-08'),
  ('comptia-secplus-v8', 'CompTIA', 'CompTIA Security+ — V8 launch date', 'https://www.comptia.org/certifications/security', NULL, TRUE, DATE '2026-11-08')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, title = EXCLUDED.title, url = EXCLUDED.url,
  as_of = EXCLUDED.as_of, verified = EXCLUDED.verified, checked_on = EXCLUDED.checked_on;

-- ── Careers (entry pay deliberately unchanged) ─────────────────────────────
UPDATE careers SET median_pay_value = 99280, job_growth_value = 4, job_growth_unit = '% (2025–35)',
  typical_entry_education_value = 'Bachelor''s degree', updated_at = now() WHERE id = 'architect';
UPDATE careers SET median_pay_value = 62470, job_growth_value = 7, job_growth_unit = '% (2025–35)',
  typical_entry_education_value = 'High school diploma or equivalent', updated_at = now() WHERE id = 'chef';
UPDATE careers SET median_pay_value = 100840, job_growth_value = 6, job_growth_unit = '% (2025–35)',
  license_url = 'https://ncees.org/exams/pe-exam/civil/', updated_at = now() WHERE id = 'civil-engineer';
UPDATE careers SET median_pay_value = 129180, job_growth_value = 21, job_growth_unit = '% (2025–35)',
  updated_at = now() WHERE id = 'cybersecurity-analyst';
-- Software developers only (BLS also lists a higher-level group incl. QA analysts/testers);
-- growth is only published for the combined group.
UPDATE careers SET median_pay_value = 135980, job_growth_value = 10, job_growth_unit = '% (2025–35)',
  updated_at = now() WHERE id = 'software-developer';

-- ── Stages ─────────────────────────────────────────────────────────────────
UPDATE pathway_stages SET fee_value = 1578, fee_source_id = 'ncarb-fees' WHERE career_id = 'architect' AND id = 'ncarb';
UPDATE pathway_stages SET years_source_id = 'mdc-culinary-as' WHERE career_id = 'chef' AND id = 'mdc-as-culinary';
UPDATE pathway_stages SET fee_source_id = 'servsafe-manager-price' WHERE career_id = 'chef' AND id = 'cert-servsafe';
UPDATE pathway_stages SET fee_value = 225, fee_source_id = 'ncees-fe-fee' WHERE career_id = 'civil-engineer' AND id = 'ncees-fe';
UPDATE pathway_stages SET years_source_id = 'mdc-entec-as' WHERE career_id = 'cybersecurity-analyst' AND id = 'mdc-as-cybersecurity';
UPDATE pathway_stages SET years_source_id = 'mdc-entec-as' WHERE career_id = 'software-developer' AND id = 'mdc-as-programming';

-- ── MDC tuition ("Total Cost Per Credit" = tuition + per-credit fees) ──────
UPDATE schools SET tuition_in_state_value = 118.22, tuition_in_state_source_id = 'mdc-tuition-per-credit',
  tuition_out_state_value = 402.51, tuition_out_state_source_id = 'mdc-tuition-per-credit'
WHERE id = 'mdc';

-- ── Notes ──────────────────────────────────────────────────────────────────
INSERT INTO career_notes (career_id, position, text, source_id) VALUES
  ('chef', 1, 'Chefs and head cooks typically need 5 years or more of work experience in a related occupation.', 'bls-chefs'),
  ('cybersecurity-analyst', 1, 'CompTIA Security+ V8 is expected to launch on or around November 17, 2026. Check which exam version to study for.', 'comptia-secplus-v8')
ON CONFLICT (career_id, position) DO UPDATE SET text = EXCLUDED.text, source_id = EXCLUDED.source_id;

COMMIT;
