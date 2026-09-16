const db = require('../../../db/db');
const behaviorMlService = require('../services/behaviorMlService');

/**
 * Controller: Behavioral & Environmental Machine Learning
 */

// 1. Predict single learner (or 7-subject profile)
exports.getLearnerPrediction = async (req, res) => {
  try {
    const { childId } = req.params;
    const { subject } = req.query;

    let studentData = req.body && Object.keys(req.body).length > 0 ? req.body : null;

    if (!studentData && childId) {
      // Fetch learner record from PostgreSQL database
      const q = `
        SELECT c.id as child_id, c.full_name, c.surname, u.gender, c.grade, c.stream,
               cl.name as class_name,
               COALESCE((SELECT COUNT(*) FROM children ch WHERE ch.class_id = c.class_id), 35) as class_size,
               COALESCE((
                 SELECT COUNT(*) FROM attendance a 
                 WHERE a.child_id = c.id AND a.status = 'absent'
               ), 2) as absent_count,
               COALESCE((
                 SELECT ROUND(AVG(score)) FROM assessment_results ar 
                 WHERE ar.child_id = c.id
               ), 60) as avg_assessment
        FROM children c
        LEFT JOIN users u ON c.learner_user_id = u.id
        LEFT JOIN classes cl ON c.class_id = cl.id
        WHERE c.id = $1
      `;
      const result = await db.query(q, [childId]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const gradeStr = row.grade ? `Grade ${row.grade}` : 'Grade 10';
        studentData = {
          student_id: `STU${row.child_id}`,
          full_name: `${row.full_name || ''} ${row.surname || ''}`.trim(),
          gender: (row.gender || 'Male').toLowerCase() === 'female' ? 'Female' : 'Male',
          grade: gradeStr,
          stream: row.stream || 'Science',
          class_name: row.class_name || '10A',
          class_size: parseInt(row.class_size, 10) || 35,
          absence_days: (parseInt(row.absent_count, 10) || 0) > 7 ? 'Above-7' : 'Under-7',
          weekly_study_hours: 14,
          visited_resources: 65,
          announcements_viewed: 50,
          discussion_participation: 45,
          homework_completion_rate: 70
        };
      }
    }

    if (!studentData) {
      return res.status(400).json({ error: 'Learner record not found or no student payload provided.' });
    }

    if (subject) {
      const prediction = behaviorMlService.predictLearnerSubject(studentData, subject);
      return res.json(prediction);
    }

    // Default: full 7-subject profile with NSC endorsement
    const fullProfile = behaviorMlService.predictLearnerFullProfile(studentData);
    return res.json(fullProfile);
  } catch (err) {
    console.error('[BehaviorML Controller] Error getting learner prediction:', err);
    res.status(500).json({ error: 'Failed to generate behavioral prediction: ' + err.message });
  }
};

// 2. Predict Class Cohort
exports.getClassPrediction = async (req, res) => {
  try {
    const { classId } = req.params;

    // Fetch students in this class
    const q = `
      SELECT c.id as child_id, c.full_name, c.surname, u.gender, c.grade, c.stream,
             cl.name as class_name,
             COALESCE((
               SELECT COUNT(*) FROM attendance a 
               WHERE a.child_id = c.id AND a.status = 'absent'
             ), 2) as absent_count
      FROM children c
      LEFT JOIN users u ON c.learner_user_id = u.id
      LEFT JOIN classes cl ON c.class_id = cl.id
      WHERE c.class_id = $1
    `;
    const result = await db.query(q, [classId]);
    const students = result.rows.map(r => ({
      student_id: `STU${r.child_id}`,
      full_name: `${r.full_name || ''} ${r.surname || ''}`.trim(),
      gender: (r.gender || 'Male').toLowerCase() === 'female' ? 'Female' : 'Male',
      grade: r.grade ? `Grade ${r.grade}` : 'Grade 10',
      stream: r.stream || 'Science',
      class_size: result.rows.length,
      absence_days: r.absent_count > 7 ? 'Above-7' : 'Under-7',
      weekly_study_hours: 12,
      visited_resources: 55,
      announcements_viewed: 45,
      discussion_participation: 40,
      homework_completion_rate: 65
    }));

    const classInfo = {
      name: result.rows[0]?.class_name || `Class ${classId}`,
      class_size: students.length,
      stream: result.rows[0]?.stream || 'Science'
    };

    const cohortReport = behaviorMlService.predictClassCohort(students, classInfo);
    res.json(cohortReport);
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
