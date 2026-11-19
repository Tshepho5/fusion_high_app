'use strict';

async function keepPreviousReport(db, { childId, term, academicYear, reason, userId }) {
  try {
    const existing = await db.query(
      `SELECT school_id, child_id, academic_year, term, grade, class_name, marks_breakdown,
              overall_average, promotion_status, teacher_comment, principal_comment
       FROM report_cards
       WHERE child_id = $1 AND term = $2 AND academic_year = $3
       LIMIT 1`,
      [childId, term, academicYear]
    );
    const row = existing.rows[0];
    if (!row) return;
    await db.query(
      `INSERT INTO report_card_versions
        (school_id, child_id, academic_year, term, grade, class_name, snapshot, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        row.school_id,
        row.child_id,
        row.academic_year,
        row.term,
        row.grade,
        row.class_name,
        JSON.stringify(row),
        reason || 'Report replaced by a later save',
        userId || null
      ]
    );
  } catch (err) {
    console.warn('[REPORT VERSION]', err.message);
  }
}

module.exports = { keepPreviousReport };
