-- Corrects databases that already applied the first lesson-planning migration.
-- Safe to run more than once. Does not drop lesson rows, schools, users, classes, or timetables.
-- Does not reset sequences.

-- Zero and out-of-range durations cannot satisfy the new checks. Clear only those values.
UPDATE lesson_plans
SET duration_minutes = NULL
WHERE duration_minutes IS NOT NULL
  AND (duration_minutes < 1 OR duration_minutes > 300);

UPDATE lesson_presentation_stages
SET duration_minutes = NULL
WHERE duration_minutes IS NOT NULL
  AND (duration_minutes < 1 OR duration_minutes > 300);

-- Preserve lesson records when a teacher account is deleted.
-- The existing user-delete flow removes the user row; CASCADE would have deleted the lessons.
ALTER TABLE lesson_plans ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE lesson_notes ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE lesson_plan_templates ALTER COLUMN teacher_id DROP NOT NULL;

ALTER TABLE lesson_plans DROP CONSTRAINT IF EXISTS lesson_plans_teacher_id_fkey;
ALTER TABLE lesson_plans
  ADD CONSTRAINT lesson_plans_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS lesson_notes_teacher_id_fkey;
ALTER TABLE lesson_notes
  ADD CONSTRAINT lesson_notes_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lesson_plan_templates DROP CONSTRAINT IF EXISTS lesson_plan_templates_teacher_id_fkey;
ALTER TABLE lesson_plan_templates
  ADD CONSTRAINT lesson_plan_templates_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;

-- Do not cascade-delete educational records when a school row is removed.
-- There is no application path that deletes schools. RESTRICT makes that explicit.
ALTER TABLE lesson_plans DROP CONSTRAINT IF EXISTS lesson_plans_school_id_fkey;
ALTER TABLE lesson_plans
  ADD CONSTRAINT lesson_plans_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

ALTER TABLE lesson_notes DROP CONSTRAINT IF EXISTS lesson_notes_school_id_fkey;
ALTER TABLE lesson_notes
  ADD CONSTRAINT lesson_notes_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

ALTER TABLE lesson_plan_templates DROP CONSTRAINT IF EXISTS lesson_plan_templates_school_id_fkey;
ALTER TABLE lesson_plan_templates
  ADD CONSTRAINT lesson_plan_templates_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT;

-- homework_assignments is the homework hub. The assignments table stores learner scores and is not used here.
ALTER TABLE lesson_assignments DROP CONSTRAINT IF EXISTS lesson_assignments_homework_fk;
ALTER TABLE lesson_assignments
  ADD CONSTRAINT lesson_assignments_homework_fk
  FOREIGN KEY (homework_assignment_id) REFERENCES homework_assignments(id) ON DELETE SET NULL;

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS academic_year INTEGER;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS term INTEGER;

DO $$ BEGIN
  ALTER TABLE lesson_plans ADD CONSTRAINT lesson_plans_duration_check
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 300);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_plans ADD CONSTRAINT lesson_plans_grade_check
    CHECK (grade BETWEEN 1 AND 12);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_plans ADD CONSTRAINT lesson_plans_year_check
    CHECK (academic_year BETWEEN 2000 AND 2100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_presentation_stages ADD CONSTRAINT lesson_stages_duration_check
    CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 300);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_evaluations ADD CONSTRAINT lesson_evaluations_type_check
    CHECK (question_type IN ('short_answer', 'multiple_choice', 'practical', 'oral', 'written'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_notes ADD CONSTRAINT lesson_notes_grade_check
    CHECK (grade BETWEEN 1 AND 12);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_notes ADD CONSTRAINT lesson_notes_year_check
    CHECK (academic_year IS NULL OR academic_year BETWEEN 2000 AND 2100);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_notes ADD CONSTRAINT lesson_notes_term_check
    CHECK (term IS NULL OR term BETWEEN 1 AND 4);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_materials ADD CONSTRAINT lesson_materials_stored_name_check
    CHECK (attachment_stored_name IS NULL OR attachment_stored_name ~ '^[0-9]+-[a-f0-9]{32}(\.[a-z0-9]{1,8})?$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE lesson_note_sections ADD CONSTRAINT lesson_note_sections_stored_name_check
    CHECK (attachment_stored_name IS NULL OR attachment_stored_name ~ '^[0-9]+-[a-f0-9]{32}(\.[a-z0-9]{1,8})?$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION lesson_planning_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lesson_plans_touch_updated_at ON lesson_plans;
CREATE TRIGGER lesson_plans_touch_updated_at
  BEFORE UPDATE ON lesson_plans
  FOR EACH ROW EXECUTE FUNCTION lesson_planning_touch_updated_at();

DROP TRIGGER IF EXISTS lesson_notes_touch_updated_at ON lesson_notes;
CREATE TRIGGER lesson_notes_touch_updated_at
  BEFORE UPDATE ON lesson_notes
  FOR EACH ROW EXECUTE FUNCTION lesson_planning_touch_updated_at();

DROP TRIGGER IF EXISTS lesson_reflections_touch_updated_at ON lesson_reflections;
CREATE TRIGGER lesson_reflections_touch_updated_at
  BEFORE UPDATE ON lesson_reflections
  FOR EACH ROW EXECUTE FUNCTION lesson_planning_touch_updated_at();

DROP TRIGGER IF EXISTS lesson_templates_touch_updated_at ON lesson_plan_templates;
CREATE TRIGGER lesson_templates_touch_updated_at
  BEFORE UPDATE ON lesson_plan_templates
  FOR EACH ROW EXECUTE FUNCTION lesson_planning_touch_updated_at();

CREATE OR REPLACE FUNCTION lesson_planning_enforce_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owner_school integer;
  linked_school integer;
  plan_school integer;
  plan_teacher integer;
BEGIN
  IF NEW.teacher_id IS NOT NULL THEN
    SELECT school_id INTO owner_school FROM users WHERE id = NEW.teacher_id;
    IF owner_school IS NULL OR owner_school <> NEW.school_id THEN
      RAISE EXCEPTION 'Teacher % is not a member of school %', NEW.teacher_id, NEW.school_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'A teacher is required'
      USING ERRCODE = '23514';
  END IF;

  IF TG_TABLE_NAME IN ('lesson_plans', 'lesson_notes') THEN
    IF NEW.class_id IS NOT NULL THEN
      SELECT school_id INTO linked_school FROM classes WHERE id = NEW.class_id;
      IF linked_school IS NOT NULL AND linked_school <> NEW.school_id THEN
        RAISE EXCEPTION 'Class % does not belong to school %', NEW.class_id, NEW.school_id
          USING ERRCODE = '23514';
      END IF;
    END IF;

    IF NEW.subject_id IS NOT NULL THEN
      SELECT school_id INTO linked_school FROM subjects WHERE id = NEW.subject_id;
      IF linked_school IS NOT NULL AND linked_school <> NEW.school_id THEN
        RAISE EXCEPTION 'Subject % does not belong to school %', NEW.subject_id, NEW.school_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'lesson_plans' THEN
    IF NEW.timetable_id IS NOT NULL THEN
      SELECT school_id INTO linked_school FROM timetables WHERE id = NEW.timetable_id;
      IF linked_school IS NOT NULL AND linked_school <> NEW.school_id THEN
        RAISE EXCEPTION 'Timetable % does not belong to school %', NEW.timetable_id, NEW.school_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'lesson_notes' THEN
    IF NEW.lesson_plan_id IS NOT NULL THEN
      SELECT school_id, teacher_id INTO plan_school, plan_teacher
      FROM lesson_plans WHERE id = NEW.lesson_plan_id;
      IF plan_school IS NULL OR plan_school <> NEW.school_id THEN
        RAISE EXCEPTION 'The linked lesson plan is not in this school'
          USING ERRCODE = '23514';
      END IF;
      IF NEW.teacher_id IS NOT NULL AND plan_teacher IS NOT NULL AND plan_teacher <> NEW.teacher_id THEN
        RAISE EXCEPTION 'The linked lesson plan belongs to another teacher'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lesson_plans_enforce_scope ON lesson_plans;
CREATE TRIGGER lesson_plans_enforce_scope
  BEFORE INSERT OR UPDATE ON lesson_plans
  FOR EACH ROW EXECUTE FUNCTION lesson_planning_enforce_scope();

DROP TRIGGER IF EXISTS lesson_notes_enforce_scope ON lesson_notes;
CREATE TRIGGER lesson_notes_enforce_scope
  BEFORE INSERT OR UPDATE ON lesson_notes
  FOR EACH ROW EXECUTE FUNCTION lesson_planning_enforce_scope();

DROP TRIGGER IF EXISTS lesson_templates_enforce_scope ON lesson_plan_templates;
CREATE TRIGGER lesson_templates_enforce_scope
  BEFORE INSERT OR UPDATE ON lesson_plan_templates
  FOR EACH ROW EXECUTE FUNCTION lesson_planning_enforce_scope();

CREATE OR REPLACE FUNCTION lesson_planning_enforce_homework()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  plan_school integer;
  plan_teacher integer;
  hw_school integer;
  hw_teacher integer;
BEGIN
  IF NEW.homework_assignment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT school_id, teacher_id INTO plan_school, plan_teacher
  FROM lesson_plans WHERE id = NEW.lesson_plan_id;

  SELECT school_id, teacher_id INTO hw_school, hw_teacher
  FROM homework_assignments WHERE id = NEW.homework_assignment_id;

  IF hw_teacher IS NULL THEN
    RAISE EXCEPTION 'Homework record % was not found', NEW.homework_assignment_id
      USING ERRCODE = '23503';
  END IF;
  IF plan_teacher IS NOT NULL AND hw_teacher <> plan_teacher THEN
    RAISE EXCEPTION 'Homework record % belongs to another teacher', NEW.homework_assignment_id
      USING ERRCODE = '23514';
  END IF;
  IF hw_school IS NOT NULL AND plan_school IS NOT NULL AND hw_school <> plan_school THEN
    RAISE EXCEPTION 'Homework record % belongs to another school', NEW.homework_assignment_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lesson_assignments_enforce_homework ON lesson_assignments;
CREATE TRIGGER lesson_assignments_enforce_homework
  BEFORE INSERT OR UPDATE ON lesson_assignments
  FOR EACH ROW EXECUTE FUNCTION lesson_planning_enforce_homework();

CREATE INDEX IF NOT EXISTS idx_lesson_plans_filters
  ON lesson_plans (school_id, teacher_id, subject_name, grade, class_name);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_upcoming
  ON lesson_plans (school_id, teacher_id, scheduled_date)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_lesson_notes_filters
  ON lesson_notes (school_id, teacher_id, subject_name, grade);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_homework
  ON lesson_assignments (homework_assignment_id)
  WHERE homework_assignment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_templates_owner
  ON lesson_plan_templates (teacher_id, updated_at DESC);
