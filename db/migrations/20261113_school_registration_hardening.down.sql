-- Reverses only the school-registration hardening added on 2026-11-13.
-- Dropping logo_stored_name removes the stored logo filename from applications.
-- It does not delete schools, users, or logo files on disk.

DROP INDEX IF EXISTS school_applications_open_emis_unique;
DROP INDEX IF EXISTS schools_emis_number_unique;
ALTER TABLE school_applications DROP COLUMN IF EXISTS logo_stored_name;
