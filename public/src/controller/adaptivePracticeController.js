const crypto = require('crypto');
const db = require('../../../db/db');
const engine = require('../services/capsAdaptiveEngine');

const pendingItems = new Map();
let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS learner_concept_mastery (
      user_id INTEGER NOT NULL,
      concept_id VARCHAR(80) NOT NULL,
      p_mastery DOUBLE PRECISION NOT NULL DEFAULT 0.25,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, concept_id)
    );
  `);
  schemaReady = true;
}

async function loadRecords(userId) {
  await ensureSchema();
  const result = await db.query(
    'SELECT concept_id, p_mastery, attempts, correct_count FROM learner_concept_mastery WHERE user_id = $1',
    [userId]
  );
  const records = {};
  result.rows.forEach((row) => {
    records[row.concept_id] = {
      p_mastery: Number(row.p_mastery),
      attempts: Number(row.attempts),
      correct_count: Number(row.correct_count)
    };
  });
  return records;
}

function issueItem(userId, concept) {
  const generated = engine.generateItem(concept);
  const token = crypto.randomBytes(12).toString('hex');
  pendingItems.set(token, {
    userId: String(userId),
    conceptId: concept.id,
    answer: generated.answer,
    explanation: generated.explanation,
    created: Date.now()
  });
  return {
    token,
    prompt: generated.prompt,
    kind: generated.kind
  };
}

function present(records, decision, item) {
  const row = records[decision.concept.id];
  return {
    success: true,
    subject: decision.concept.subject,
    concept: {
      id: decision.concept.id,
      title: decision.concept.title,
      grade: decision.concept.grade,
      note: decision.concept.note
    },
    mastery: row ? row.p_mastery : null,
    attempts: row ? row.attempts : 0,
    steppedBack: decision.steppedBack,
    fromConcept: decision.from ? { id: decision.from.id, title: decision.from.title, grade: decision.from.grade } : null,
    pathReason: decision.reason,
    item,
    graph: engine.graphView(decision.concept.subject, records, decision.concept.id)
  };
}

exports.getPractice = async (req, res) => {
  try {
    const subject = engine.normaliseSubject(req.query.subject);
    const grade = Number(req.query.grade) || 11;
    const records = await loadRecords(req.user.id);
    const decision = engine.chooseConcept(subject, grade, records);
    const item = issueItem(req.user.id, decision.concept);
    res.json(present(records, decision, item));
  } catch (err) {
    console.error('Adaptive practice load failed:', err.message);
    res.status(500).json({ error: 'Could not build the next practice item.' });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { token, answer, grade } = req.body || {};
    const pending = pendingItems.get(token);
    if (!pending || String(pending.userId) !== String(req.user.id)) {
      return res.status(400).json({ error: 'This practice item has expired. Load a new one.' });
    }
    if (Date.now() - pending.created > 30 * 60 * 1000) {
      pendingItems.delete(token);
      return res.status(400).json({ error: 'This practice item has expired. Load a new one.' });
    }
    pendingItems.delete(token);

    const correct = engine.answersMatch(pending.answer, answer);
    const records = await loadRecords(req.user.id);
    const prior = records[pending.conceptId]?.p_mastery ?? engine.P_L0;
    const attempts = (records[pending.conceptId]?.attempts || 0) + 1;
    const correctCount = (records[pending.conceptId]?.correct_count || 0) + (correct ? 1 : 0);
    const nextMastery = engine.updateMastery(prior, correct);

    await db.query(`
      INSERT INTO learner_concept_mastery (user_id, concept_id, p_mastery, attempts, correct_count, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, concept_id)
      DO UPDATE SET p_mastery = EXCLUDED.p_mastery, attempts = EXCLUDED.attempts, correct_count = EXCLUDED.correct_count, updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, pending.conceptId, nextMastery, attempts, correctCount]);

    records[pending.conceptId] = { p_mastery: nextMastery, attempts, correct_count: correctCount };
    const concept = engine.byId[pending.conceptId];
    const decision = engine.chooseConcept(concept.subject, Number(grade) || concept.grade, records, {
      afterMissId: correct ? null : concept.id
    });
    const item = issueItem(req.user.id, decision.concept);

    res.json({
      correct,
      expected: pending.answer,
      explanation: pending.explanation,
      updatedMastery: nextMastery,
      ...present(records, decision, item)
    });
  } catch (err) {
    console.error('Adaptive practice answer failed:', err.message);
    res.status(500).json({ error: 'Could not mark this practice item.' });
  }
};

exports.getClassGaps = async (req, res) => {
  try {
    await ensureSchema();
    const schoolId = req.user.school_id || null;
    const result = await db.query(`
      SELECT u.full_name, u.surname, u.id AS user_id, m.concept_id, m.p_mastery, m.attempts, m.correct_count
      FROM learner_concept_mastery m
      JOIN users u ON u.id = m.user_id
      WHERE m.attempts > 0
        AND m.p_mastery < 0.5
        AND ($1::int IS NULL OR u.school_id = $1)
      ORDER BY m.p_mastery ASC, m.updated_at DESC
      LIMIT 30
    `, [schoolId]);

    const gaps = result.rows.map((row) => {
      const concept = engine.byId[row.concept_id];
      return {
        learner: `${row.full_name || ''} ${row.surname || ''}`.trim(),
        user_id: row.user_id,
        concept_id: row.concept_id,
        concept: concept ? concept.title : row.concept_id,
        grade: concept ? concept.grade : null,
        subject: concept ? concept.subject : '',
        mastery: Number(row.p_mastery),
        attempts: Number(row.attempts),
        below_pass: true
      };
    });

    res.json({
      success: true,
      pass_mark: 0.5,
      gaps
    });
  } catch (err) {
    console.error('Concept gap report failed:', err.message);
    res.status(500).json({ error: 'Could not load concept gaps.' });
  }
};
