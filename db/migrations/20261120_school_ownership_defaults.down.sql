-- Restores school_id default 1. Does not rewrite existing rows.
-- Do not run this file against FUSION_DB.

DO $$
DECLARE row record;
BEGIN
  IF current_database() <> 'geleza_phase_g2' THEN
    RAISE EXCEPTION 'Refusing school ownership rollback on %', current_database();
  END IF;
  FOR row IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'school_id'
      AND column_default IS NULL
      AND table_name <> 'timetables'
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN school_id SET DEFAULT 1', row.table_name);
  END LOOP;
END $$;
