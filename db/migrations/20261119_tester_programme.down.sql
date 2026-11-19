-- Removes the tester programme tables only.
-- User, school, and learner columns are left in place so a downgrade does not drop account state.

DROP TABLE IF EXISTS tester_reports;
DROP TABLE IF EXISTS tester_invitations;
