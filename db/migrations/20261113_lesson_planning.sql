-- Lesson planning and lesson notes.
-- Idempotent forward migration. Does not alter existing school, teacher, learner, or timetable rows.
-- Reverse with db/migrations/20261113_lesson_planning.down.sql

CREATE TABLE IF NOT EXISTS lesson_plans (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  subject_name VARCHAR(150) NOT NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  class_name VARCHAR(100),
  grade INTEGER NOT NULL,
  academic_year INTEGER NOT NULL,
  term INTEGER NOT NULL CHECK (term BETWEEN 1 AND 4),
  scheduled_date DATE,
  scheduled_time TIME,
  duration_minutes INTEGER,
  topic VARCHAR(500),
  sub_topic VARCHAR(500),
  previous_knowledge TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'completed')),
  timetable_id INTEGER REFERENCES timetables(id) ON DELETE SET NULL,
  timetable_class VARCHAR(100),
  timetable_day VARCHAR(20),
  timetable_period VARCHAR(50),
  last_reminder_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_school_teacher ON lesson_plans(school_id, teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_schedule ON lesson_plans(school_id, teacher_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_updated ON lesson_plans(school_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS lesson_objectives (
  id SERIAL PRIMARY KEY,
  lesson_plan_id INTEGER NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lesson_objectives_plan ON lesson_objectives(lesson_plan_id, display_order);

CREATE TABLE IF NOT EXISTS lesson_materials (
  id SERIAL PRIMARY KEY,
  lesson_plan_id INTEGER NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  material_name VARCHAR(255) NOT NULL,
  description TEXT,
  attachment_original_name VARCHAR(255),
  attachment_stored_name VARCHAR(255),
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_plan ON lesson_materials(lesson_plan_id, display_order);

CREATE TABLE IF NOT EXISTS lesson_methods (
  id SERIAL PRIMARY KEY,
  lesson_plan_id INTEGER NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  method_name VARCHAR(150) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lesson_methods_plan ON lesson_methods(lesson_plan_id, display_order);

CREATE TABLE IF NOT EXISTS lesson_references (
  id SERIAL PRIMARY KEY,
  lesson_plan_id INTEGER NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  reference_title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  reference_type VARCHAR(80),
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lesson_references_plan ON lesson_references(lesson_plan_id, display_order);

CREATE TABLE IF NOT EXISTS lesson_presentation_stages (
  id SERIAL PRIMARY KEY,
  lesson_plan_id INTEGER NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  stage_name VARCHAR(150) NOT NULL,
  duration_minutes INTEGER,
  teacher_activities TEXT,
  learner_activities TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lesson_stages_plan ON lesson_presentation_stages(lesson_plan_id, display_order);

CREATE TABLE IF NOT EXISTS lesson_evaluations (
  id SERIAL PRIMARY KEY,
  lesson_plan_id INTEGER NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(40) NOT NULL DEFAULT 'short_answer',
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lesson_evaluations_plan ON lesson_evaluations(lesson_plan_id, display_order);

CREATE TABLE IF NOT EXISTS lesson_assignments (
  id SERIAL PRIMARY KEY,
  lesson_plan_id INTEGER NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  homework_assignment_id INTEGER,
  title VARCHAR(255),
  assignment_content TEXT,
  due_date DATE,
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_plan ON lesson_assignments(lesson_plan_id, display_order);

CREATE TABLE IF NOT EXISTS lesson_reflections (
  id SERIAL PRIMARY KEY,
  lesson_plan_id INTEGER NOT NULL UNIQUE REFERENCES lesson_plans(id) ON DELETE CASCADE,
  objectives_achieved_flag BOOLEAN,
  objectives_achieved TEXT,
  what_went_well TEXT,
  challenges TEXT,
  learners_needing_support TEXT,
  areas_for_improvement TEXT,
  recommendations TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_notes (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_plan_id INTEGER REFERENCES lesson_plans(id) ON DELETE SET NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  subject_name VARCHAR(150) NOT NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  class_name VARCHAR(100),
  grade INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  topic VARCHAR(500),
  sub_topic VARCHAR(500),
  introduction TEXT,
  content TEXT,
  summary TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'saved')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_teacher ON lesson_notes(school_id, teacher_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_plan ON lesson_notes(lesson_plan_id);

CREATE TABLE IF NOT EXISTS lesson_note_sections (
  id SERIAL PRIMARY KEY,
  lesson_note_id INTEGER NOT NULL REFERENCES lesson_notes(id) ON DELETE CASCADE,
  heading VARCHAR(200) NOT NULL,
  body TEXT,
  attachment_original_name VARCHAR(255),
  attachment_stored_name VARCHAR(255),
  display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_lesson_note_sections_note ON lesson_note_sections(lesson_note_id, display_order);

CREATE TABLE IF NOT EXISTS lesson_plan_templates (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_name VARCHAR(200) NOT NULL,
  template_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'school')),
  source_lesson_plan_id INTEGER REFERENCES lesson_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_lesson_templates_school ON lesson_plan_templates(school_id, visibility, teacher_id);
