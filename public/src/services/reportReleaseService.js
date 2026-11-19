'use strict';

const db = require('../../../db/db');
const { assembleParentReleases, assembleLearnerReleases } = require('../../../lib/reportRelease');

const CARD_COLUMNS = `
  child_id, academic_year, term, grade, class_name, is_published, status,
  overall_average, overall_level, published_at
`;

async function cardsFor(childIds) {
  if (!childIds.length) return [];
  const result = await db.query(
    `SELECT ${CARD_COLUMNS}
     FROM report_cards
     WHERE child_id = ANY($1::int[])
     ORDER BY academic_year DESC, term DESC`,
    [childIds]
  );
  return result.rows;
}

async function listForParent(parentId) {
  const children = await db.query(
    `SELECT DISTINCT ON (c.id)
        c.id AS child_id,
        c.full_name,
        c.surname,
        c.grade,
        c.class_name,
        c.parent_id,
        c.secondary_parent_id
     FROM children c
     LEFT JOIN parent_children pc
       ON pc.child_id = c.id AND pc.parent_id::text = $1::text
     WHERE c.parent_id::text = $1::text
        OR c.secondary_parent_id::text = $1::text
        OR pc.parent_id IS NOT NULL
     ORDER BY c.id`,
    [String(parentId)]
  );
  const rows = children.rows.map((row) => ({ ...row, parent_ids: [String(parentId)] }));
  const cards = await cardsFor(rows.map((row) => row.child_id));
  return assembleParentReleases(parentId, rows, cards);
}

async function listForLearner(userId) {
  const children = await db.query(
    `SELECT id AS child_id, full_name, surname, grade, class_name
     FROM children
     WHERE learner_user_id::text = $1::text OR id::text = $1::text`,
    [String(userId)]
  );
  const cards = await cardsFor(children.rows.map((row) => row.child_id));
  return assembleLearnerReleases(children.rows, cards);
}

module.exports = { listForParent, listForLearner };
