const db = require('../../../db/db');

let ready = false;

async function ensureAuditSchema() {
  if (ready) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS application_correction_audit (
      id SERIAL PRIMARY KEY,
      application_id INTEGER,
      application_number VARCHAR(50),
      support_ticket_id INTEGER,
      admin_user_id INTEGER NOT NULL,
      school_id INTEGER,
      before_snapshot JSONB DEFAULT '{}'::jsonb,
      after_snapshot JSONB DEFAULT '{}'::jsonb,
      changed_fields TEXT[] DEFAULT '{}',
      user_synced BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_app_correction_audit_app
      ON application_correction_audit(application_id);
    CREATE INDEX IF NOT EXISTS idx_app_correction_audit_admin
      ON application_correction_audit(admin_user_id);
    CREATE INDEX IF NOT EXISTS idx_app_correction_audit_created
      ON application_correction_audit(created_at DESC);
  `);
  ready = true;
}

async function logApplicationCorrection({
  applicationId,
  applicationNumber,
  supportTicketId,
  adminUserId,
  schoolId,
  beforeSnapshot,
  afterSnapshot,
  changedFields,
  userSynced
}) {
  await ensureAuditSchema();
  await db.query(
    `INSERT INTO application_correction_audit (
       application_id, application_number, support_ticket_id, admin_user_id, school_id,
       before_snapshot, after_snapshot, changed_fields, user_synced
     ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9)`,
    [
      applicationId || null,
      applicationNumber || null,
      supportTicketId || null,
      adminUserId,
      schoolId || null,
      JSON.stringify(beforeSnapshot || {}),
      JSON.stringify(afterSnapshot || {}),
      changedFields || [],
      Boolean(userSynced)
    ]
  );
}

module.exports = { ensureAuditSchema, logApplicationCorrection };
