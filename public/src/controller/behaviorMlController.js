const db = require('../../../db/db');
const behaviorMlService = require('../services/behaviorMlService');
const { loadAuthorisedLearner, loadAuthorisedClass } = require('../../../lib/aiLearnerAccess');

/**
 * Controller: Behavioral & Environmental Machine Learning
 */

// 1. Predict single learner (or 7-subject profile)
exports.getLearnerPrediction = async (req, res) => {
  try {
    const childId = req.params.childId || req.body.childId;
    const access = await loadAuthorisedLearner(db, req.user, childId);
    if (access.status !== 200) {
      return res.status(404).json({ error: 'Learner not found' });
    }
    const learner = access.learner;
    const attendance = await db.query(
      `SELECT COUNT(*)::int AS absences FROM attendance WHERE child_id = $1 AND status = 'absent'`,
      [learner.id]
    );
    return res.json({
      prediction_available: false,
      official_result: false,
      learner: {
        id: learner.id,
        name: `${learner.full_name || ''} ${learner.surname || ''}`.trim(),
        grade: learner.grade || null,
        stream: learner.stream || null
      },
      recorded_absences: attendance.rows[0] ? attendance.rows[0].absences : null,
      message: 'A behaviour prediction was not produced. Study habits, gender, and missing marks are not replaced with sample values.'
    });
  } catch (err) {
    console.error('[BehaviorML Controller] Error getting learner prediction:', err);
    res.status(500).json({ error: 'Failed to generate behavioral prediction: ' + err.message });
  }
};

// 2. Predict Class Cohort
exports.getClassPrediction = async (req, res) => {
  try {
    const access = await loadAuthorisedClass(db, req.user, req.params.classId);
    if (access.status !== 200) {
      return res.status(404).json({ error: 'Class not found' });
    }
    const result = await db.query(
      `SELECT c.id, c.full_name, c.surname, c.grade, c.stream,
              (SELECT COUNT(*)::int FROM attendance a WHERE a.child_id = c.id AND a.status = 'absent') AS absences
       FROM children c
       WHERE c.class_id = $1 AND c.school_id = $2`,
      [access.classRow.id, access.classRow.school_id]
    );
    res.json({
      prediction_available: false,
      official_result: false,
      class_name: access.classRow.name || null,
      learners: result.rows.map((row) => ({
        id: row.id,
        name: `${row.full_name || ''} ${row.surname || ''}`.trim(),
        grade: row.grade || null,
        stream: row.stream || null,
        recorded_absences: row.absences
      })),
      message: 'A class behaviour prediction was not produced from sample study habits or sample marks.'
    });
  } catch (err) {
    console.error('[BehaviorML Controller] Error predicting class cohort:', err);
    res.status(500).json({ error: 'Failed to predict class cohort: ' + err.message });
  }
};

// 3. Interactive What-If Simulation
exports.simulateIntervention = (req, res) => {
  try {
    const { student, adjustments } = req.body;
    if (!student) {
      return res.status(400).json({ error: 'Missing student data payload for simulation.' });
    }
    const result = behaviorMlService.simulateWhatIf(student, adjustments || {});
    res.json(result);
  } catch (err) {
    console.error('[BehaviorML Controller] Error running simulation:', err);
    res.status(500).json({ error: 'Failed to run what-if simulation: ' + err.message });
  }
};

// 4. Get Persona Archetype Catalogue
exports.getPersonasCatalogue = (req, res) => {
  try {
    if (!behaviorMlService.modelData) behaviorMlService.loadModel();
    const personas = behaviorMlService.modelData?.unsupervised_personas || [];
    res.json(personas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
