-- Non-destructive rollback guard for 20261121_application_lifecycle_remediation.sql
--
-- HONEST LIMITATIONS:
-- 1. Never deletes historical applications, documents, learner numbers, or audit rows.
-- 2. Refuses if any lifecycle document requests, status history rows, or new-status
--    applications have been recorded. Restore from a pre-migration backup snapshot
--    for full rollback after live use.

BEGIN;

DO $$
DECLARE
  req_cnt INTEGER := 0;
  hist_cnt INTEGER := 0;
  email_cnt INTEGER := 0;
  new_status_cnt INTEGER := 0;
BEGIN
  IF to_regclass('public.application_document_requests') IS NOT NULL THEN
    SELECT COUNT(*) INTO req_cnt FROM application_document_requests;
  END IF;
  IF to_regclass('public.application_status_history') IS NOT NULL THEN
    SELECT COUNT(*) INTO hist_cnt FROM application_status_history;
  END IF;
  IF to_regclass('public.application_email_log') IS NOT NULL THEN
    SELECT COUNT(*) INTO email_cnt FROM application_email_log;
  END IF;
  IF to_regclass('public.applications') IS NOT NULL THEN
    SELECT COUNT(*) INTO new_status_cnt
    FROM applications
    WHERE status IN ('draft', 'under_review', 'documents_requested', 'documents_submitted', 'documents_under_review', 'enrollment_pending', 'withdrawn', 'cancelled');
  END IF;

  IF req_cnt > 0 OR hist_cnt > 0 OR email_cnt > 0 OR new_status_cnt > 0 THEN
    RAISE EXCEPTION
      'ROLLBACK REFUSED (NON-DESTRUCTIVE GUARD): Found % document request(s), % history event(s), % email log(s), and % extended-status application(s). Restore from pre-migration backup snapshot instead.',
      req_cnt, hist_cnt, email_cnt, new_status_cnt;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_app_docs_app_request;
DROP INDEX IF EXISTS idx_applications_applicant_user;
DROP INDEX IF EXISTS idx_applications_parent_user;
DROP INDEX IF EXISTS idx_applications_school_status;
DROP TABLE IF EXISTS application_email_log;
DROP TABLE IF EXISTS application_status_history;
DROP TABLE IF EXISTS application_document_requests;
DROP INDEX IF EXISTS uniq_applications_provisional_learner_number;

COMMIT;
