const DAY = 24 * 60 * 60 * 1000;

// Application retention may later clear only these duplicate fields on school_applications.
// It must never delete or rewrite schools, users, employees, classes, or the decision record.
const OPERATIONAL_RECORDS_EXCLUDED = ['schools', 'users', 'employees', 'classes'];
const APPROVED_DUPLICATE_FIELDS = ['principal_id_number', 'principal_email', 'principal_phone', 'password_hash'];

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY);
}

function addMonths(date, months) {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function stripPersonalDetails(value) {
  return String(value || '')
    .replace(/\b\d{13}\b/g, '[id removed]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
    .replace(/\b(?:\+27|0)\d{8,10}\b/g, '[phone removed]')
    .slice(0, 500);
}

function decisionRecord(row) {
  return {
    application_reference: row.application_number,
    school_name: row.school_name,
    emis_number: row.emis_number,
    decision: row.status,
    decision_date: row.reviewed_at || null,
    reviewer: row.reviewed_by || null,
    decision_reason: stripPersonalDetails(row.declined_reason || '')
  };
}

function activityAt(row) {
  return new Date(row.last_activity_at || row.updated_at || row.created_at || Date.now());
}

function holdsFor(row) {
  const holds = [];
  if (row.legal_hold) holds.push('legal_hold');
  if (row.investigation_hold) holds.push('investigation_hold');
  if (row.privacy_request_open) holds.push('privacy_request');
  return holds;
}

function classify(row, policy, now) {
  const holds = holdsFor(row);
  if (holds.length) {
    return { qualifies: false, blocked: true, holds, rule: 'hold' };
  }
  const activity = activityAt(row);
  if (row.status === 'withdrawn') {
    const basis = new Date(row.withdrawn_at || row.reviewed_at || activity);
    return { qualifies: addDays(basis, policy.withdrawn_days) <= now, rule: 'withdrawn', action: 'keep_decision_record', preserves: OPERATIONAL_RECORDS_EXCLUDED };
  }
  if (row.status === 'declined') {
    const basis = new Date(row.reviewed_at || activity);
    return { qualifies: addMonths(basis, policy.declined_months) <= now, rule: 'declined', action: 'keep_decision_record', preserves: OPERATIONAL_RECORDS_EXCLUDED };
  }
  if (row.status === 'approved') {
    if (!row.principal_has_password || !row.password_set_at) {
      return {
        qualifies: false,
        rule: 'approved',
        reason: 'The 90-day period starts only after the principal activation time is recorded.'
      };
    }
    return {
      qualifies: addDays(new Date(row.password_set_at), policy.approved_after_activation_days) <= now,
      rule: 'approved',
      action: 'remove_duplicate_sensitive_application_fields',
      fields: APPROVED_DUPLICATE_FIELDS,
      preserves: OPERATIONAL_RECORDS_EXCLUDED
    };
  }
  if (row.status === 'pending_review' || row.status === 'under_review') {
    const created = new Date(row.created_at || activity).getTime();
    const updated = new Date(row.updated_at || row.created_at || activity).getTime();
    const untouched = row.status === 'pending_review' && Math.abs(updated - created) < 1000;
    const rule = untouched ? 'abandoned' : 'pending';
    const days = untouched ? policy.abandoned_days : policy.pending_days;
    return { qualifies: addDays(activity, days) <= now, rule, action: 'keep_decision_record', preserves: OPERATIONAL_RECORDS_EXCLUDED };
  }
  return { qualifies: false, rule: 'unclassified' };
}

async function loadPolicy(db) {
  const result = await db.query('SELECT * FROM retention_policy WHERE id = 1');
  return result.rows[0];
}

async function dryRun(db, now = new Date()) {
  const policy = await loadPolicy(db);
  const rows = await db.query(`
    SELECT a.application_number, a.school_name, a.emis_number, a.status,
           a.declined_reason, a.reviewed_at, a.reviewed_by, a.created_at, a.updated_at,
           a.withdrawn_at, a.last_activity_at, a.legal_hold, a.investigation_hold,
           a.privacy_request_open,
           (u.password_hash IS NOT NULL) AS principal_has_password,
           u.password_set_at
    FROM school_applications a
    LEFT JOIN users u
      ON a.status = 'approved' AND LOWER(u.email) = LOWER(a.principal_email)
  `);
  const qualifying = [];
  const blocked = [];
  const counts = { pending: 0, declined: 0, approved: 0, withdrawn: 0, abandoned: 0, blocked: 0, not_yet_due: 0 };
  for (const row of rows.rows) {
    const result = classify(row, policy, now);
    if (result.blocked) {
      counts.blocked += 1;
      blocked.push({
        application_reference: row.application_number,
        school_name: row.school_name,
        emis_number: row.emis_number,
        holds: result.holds
      });
      continue;
    }
    if (!result.qualifies) {
      counts.not_yet_due += 1;
      continue;
    }
    counts[result.rule] = (counts[result.rule] || 0) + 1;
    qualifying.push({
      application_reference: row.application_number,
      school_name: row.school_name,
      emis_number: row.emis_number,
      rule: result.rule,
      action: result.action,
      preserves: result.preserves || OPERATIONAL_RECORDS_EXCLUDED,
      decision_record: decisionRecord(row)
    });
  }
  return {
    dry_run: true,
    records_changed: false,
    deletion_scheduled: false,
    automatic_actions_enabled: policy.automatic_actions_enabled === true,
    operational_records_excluded: OPERATIONAL_RECORDS_EXCLUDED,
    approved_duplicate_fields: APPROVED_DUPLICATE_FIELDS,
    policy_note: policy.policy_note,
    periods: {
      pending_days: policy.pending_days,
      declined_months: policy.declined_months,
      approved_after_activation_days: policy.approved_after_activation_days,
      withdrawn_days: policy.withdrawn_days,
      abandoned_days: policy.abandoned_days
    },
    counts,
    qualifying,
    blocked
  };
}

function runRetentionActions() {
  throw new Error('Automatic retention is disabled. Schools, principal accounts, classes, and application records are left unchanged.');
}

module.exports = {
  classify,
  decisionRecord,
  stripPersonalDetails,
  dryRun,
  loadPolicy,
  runRetentionActions,
  OPERATIONAL_RECORDS_EXCLUDED,
  APPROVED_DUPLICATE_FIELDS
};
