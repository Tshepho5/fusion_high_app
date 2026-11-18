-- Additive school-registration hardening.
-- Does not delete schools, users, or applications.
-- Unique indexes are created only when the migration runner finds no duplicates.

ALTER TABLE school_applications ADD COLUMN IF NOT EXISTS logo_stored_name VARCHAR(80);
