-- 1. FE/PE are career-growth steps after the first job (Civil; Mechanical comes from seed-core-added.sql).
-- 2. MDC's own bachelor's programs are charged at MDC's verified baccalaureate rate.
-- Run after db/migrations/2026-11-08-verify-core-careers.sql, before db/seed-core-added.sql. Safe to re-run.

BEGIN;

ALTER TABLE pathway_stages ADD COLUMN IF NOT EXISTS after_first_job BOOLEAN;
ALTER TABLE pathway_stages ADD COLUMN IF NOT EXISTS at_start_school BOOLEAN;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS bachelor_tuition_in_state_value NUMERIC;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS bachelor_tuition_in_state_unit TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS bachelor_tuition_in_state_source_id TEXT REFERENCES sources(id);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS bachelor_tuition_out_state_value NUMERIC;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS bachelor_tuition_out_state_unit TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS bachelor_tuition_out_state_source_id TEXT REFERENCES sources(id);

-- Civil Engineer: first job right after the B.S.; FE and PE come later.
UPDATE pathway_stages SET after_first_job = TRUE WHERE career_id = 'civil-engineer' AND id IN ('ncees-fe', 'ncees-pe');
UPDATE pathway_routes SET label = 'A.A. → FIU B.S. Civil → Work · FE → PE later' WHERE career_id = 'civil-engineer' AND id = 'civil-transfer';

-- Cybersecurity: the B.S. is at MDC.
UPDATE pathway_stages SET at_start_school = TRUE WHERE career_id = 'cybersecurity-analyst' AND id = 'mdc-bs-cybersecurity';

-- MDC baccalaureate rate, verified 2026-11-08 ("Total Cost Per Credit", Baccalaureate Programs table).
INSERT INTO sources (id, label, title, url, as_of, verified, checked_on) VALUES
  ('mdc-tuition-bachelor', 'MDC', 'MDC tuition & fees — Baccalaureate programs, total cost per credit',
   'http://www.mdc.edu/student-financial-services/tuition-fees/', NULL, TRUE, DATE '2026-11-08')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, title = EXCLUDED.title, url = EXCLUDED.url,
  as_of = EXCLUDED.as_of, verified = EXCLUDED.verified, checked_on = EXCLUDED.checked_on;

UPDATE schools SET
  bachelor_tuition_in_state_value = 129.89, bachelor_tuition_in_state_unit = 'USD/credit', bachelor_tuition_in_state_source_id = 'mdc-tuition-bachelor',
  bachelor_tuition_out_state_value = 535.97, bachelor_tuition_out_state_unit = 'USD/credit', bachelor_tuition_out_state_source_id = 'mdc-tuition-bachelor'
WHERE id = 'mdc';

COMMIT;
