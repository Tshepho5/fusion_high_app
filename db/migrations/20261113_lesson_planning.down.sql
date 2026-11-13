-- Reverses the lesson-planning module.
--
-- WARNING: rolling this back deletes lesson plans, lesson notes, templates,
-- reflections, and their child rows. It does not delete schools, users,
-- classes, subjects, timetables, or homework_assignments.
-- Attachment files on disk are not removed by this script.

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

DROP FUNCTION IF EXISTS lesson_planning_enforce_homework();
DROP FUNCTION IF EXISTS lesson_planning_enforce_scope();
DROP FUNCTION IF EXISTS lesson_planning_touch_updated_at();
