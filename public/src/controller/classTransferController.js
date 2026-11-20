'use strict';

const db = require('../../../db/db');
const { resolveSchoolId } = require('../services/schoolScope');
const { decideClassTransfer } = require('../../../lib/classTransfer');

async function ensureTransferTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS learner_class_transfers (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      from_class_id INTEGER NOT NULL,
      to_class_id INTEGER NOT NULL,
      effective_on DATE NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL,
      initiated_by INTEGER NOT NULL,
      approved_by INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS learner_class_transfers_one_open
    ON learner_class_transfers (child_id)
    WHERE status = 'scheduled'
  `);
}

exports.transferLearner = async (req, res) => {
  const schoolId = resolveSchoolId(req);
  if (!schoolId) return res.status(400).json({ error: 'Open the school before transferring a learner.' });
  const childId = parseInt(req.params.id, 10);
  const destinationId = parseInt(req.body && req.body.destination_class_id, 10);
  const effectiveOn = String((req.body && req.body.effective_on) || '').slice(0, 10);
  const reason = String((req.body && req.body.reason) || '').trim();
  if (!childId || !destinationId) {
    return res.status(400).json({ error: 'Choose the learner and the destination class.' });
  }

  await ensureTransferTable();
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const learnerRes = await client.query(
      `SELECT id, school_id, class_id, grade, stream
       FROM children
       WHERE id = $1
       FOR UPDATE`,
      [childId]
    );
    const learner = learnerRes.rows[0];
    const currentRes = learner ? await client.query(
      `SELECT id, school_id, grade, stream, ownership_quarantine
       FROM classes WHERE id = $1`,
      [learner.class_id]
    ) : { rows: [] };
    const destinationRes = await client.query(
      `SELECT id, school_id, grade, stream, ownership_quarantine
       FROM classes WHERE id = $1`,
      [destinationId]
    );
    const pendingRes = await client.query(
      `SELECT id FROM learner_class_transfers
       WHERE child_id = $1 AND school_id = $2 AND status = 'scheduled'
       LIMIT 1`,
      [childId, schoolId]
    );
    const today = new Date().toISOString().slice(0, 10);
    const decision = decideClassTransfer({
      actor: {
        id: req.user && req.user.id,
        role: req.user && req.user.role,
        is_superadmin: req.user && req.user.is_superadmin === true,
        schoolId
      },
      learner,
      currentClass: currentRes.rows[0],
      destinationClass: destinationRes.rows[0],
      effectiveOn,
      reason,
      pendingTransfer: pendingRes.rows[0],
      today
    });
    if (!decision.ok) {
      await client.query('ROLLBACK');
      return res.status(decision.status).json({ error: transferMessage(decision.code), code: decision.code });
    }
    const status = decision.applyNow ? 'applied' : 'scheduled';
    const transfer = await client.query(
      `INSERT INTO learner_class_transfers
        (school_id, child_id, from_class_id, to_class_id, effective_on, reason, status, initiated_by, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING id, school_id, child_id, from_class_id, to_class_id, effective_on, status`,
      [schoolId, childId, learner.class_id, destinationId, effectiveOn, reason, status, req.user.id]
    );
    if (decision.applyNow) {
      await client.query(
        `UPDATE children
         SET class_id = $1
         WHERE id = $2 AND school_id = $3 AND class_id = $4`,
        [destinationId, childId, schoolId, learner.class_id]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: decision.applyNow
        ? 'The learner is now in the new class. Earlier marks, attendance, and reports were left unchanged.'
        : 'The transfer is scheduled. The learner stays in the current class until the effective date.',
      transfer: transfer.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Class transfer failed:', error.message);
    res.status(500).json({ error: 'The class transfer was not saved.' });
  } finally {
    client.release();
  }
};

function transferMessage(code) {
  const messages = {
    unauthenticated: 'Sign in before transferring a learner.',
    superadmin_not_operator: 'A platform administrator does not transfer learners for a school.',
    role_denied: 'Only a principal or school admin can transfer a learner.',
    missing_school: 'Open the school before transferring a learner.',
    learner_not_in_school: 'That learner was not found in this school.',
    current_class_mismatch: 'The learner’s current class could not be confirmed.',
    destination_not_in_school: 'The destination class was not found in this school.',
    destination_inactive: 'The destination class is not available.',
    same_class: 'Choose a different class. The learner is already in that class.',
    grade_mismatch: 'The destination class is not for this learner’s grade.',
    stream_mismatch: 'The destination class is not in this learner’s stream.',
    missing_date: 'Enter the date the transfer takes effect.',
    missing_reason: 'Enter a reason for the transfer.',
    pending_transfer: 'This learner already has a transfer waiting for its effective date.'
  };
  return messages[code] || 'The class transfer was not accepted.';
}
