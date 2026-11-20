-- Staging ownership correction for geleza_phase_g2 only.
-- Drops school_id defaults of 1. Does not update or delete existing rows.
-- Do not run this file against FUSION_DB.
-- Rollback: db/migrations/20261120_school_ownership_defaults.down.sql

DO $$
DECLARE row record;
BEGIN
  IF current_database() <> 'geleza_phase_g2' THEN
    RAISE EXCEPTION 'Refusing school ownership migration on %', current_database();
  END IF;
  FOR row IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'school_id'
      AND column_default = '1'
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN school_id DROP DEFAULT', row.table_name);
  END LOOP;
END $$;
