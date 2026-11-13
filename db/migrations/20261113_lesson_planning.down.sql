-- Reverses db/migrations/20261113_lesson_planning.sql
-- Drops only lesson-planning tables. Existing school data is untouched.

DROP TABLE IF EXISTS lesson_note_sections CASCADE;
DROP TABLE IF EXISTS lesson_notes CASCADE;
DROP TABLE IF EXISTS lesson_plan_templates CASCADE;
DROP TABLE IF EXISTS lesson_reflections CASCADE;
DROP TABLE IF EXISTS lesson_assignments CASCADE;
DROP TABLE IF EXISTS lesson_evaluations CASCADE;
DROP TABLE IF EXISTS lesson_presentation_stages CASCADE;
DROP TABLE IF EXISTS lesson_references CASCADE;
DROP TABLE IF EXISTS lesson_methods CASCADE;
DROP TABLE IF EXISTS lesson_materials CASCADE;
DROP TABLE IF EXISTS lesson_objectives CASCADE;
DROP TABLE IF EXISTS lesson_plans CASCADE;
