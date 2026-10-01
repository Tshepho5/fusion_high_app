/**
 * AI Advisor Routes
 * Option A API endpoints for Student Career Recommendations & Academic Risk Monitoring
 */

const express = require('express');
const router = express.Router();
const aiAdvisorService = require('../services/aiAdvisorService');
const gelezaEarlyWarningJob = require('../services/gelezaEarlyWarningJob');
const { auth: authenticateToken } = require('../../../authMiddleware');
const db = require('../../../db/db');

router.use(authenticateToken);

/**
 * POST /api/ai-advisor/predict
 * Ad-hoc prediction given scores and study parameters
 */
router.post('/predict', async (req, res) => {
  try {
    const result = await aiAdvisorService.predictStudent(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error running AI Advisor prediction:', err);
    res.status(500).json({ success: false, error: 'Failed to generate AI advisory evaluation.' });
  }
});

/**
 * GET /api/ai-advisor/learner/:childId
 * Automatic real-time AI evaluation using learner's actual database marks & attendance
 */
router.get('/learner/:childId', async (req, res) => {
  try {
    const { childId } = req.params;

    // Fetch learner and attendance
    const learnerRes = await db.query(
      `SELECT c.id, c.full_name, c.surname, c.grade, c.stream,
              COALESCE((SELECT COUNT(*) FROM attendance WHERE child_id = c.id AND status = 'absent'), 2) as absences
       FROM children c WHERE c.id = $1 LIMIT 1`,
      [childId]
    );

    if (learnerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner not found' });
    }

    const learner = learnerRes.rows[0];

    // Fetch latest marks per subject
    const marksRes = await db.query(
      `SELECT subject, score, max_score, percentage 
       FROM marks 
       WHERE child_id = $1 OR learner_id = $1
       ORDER BY recorded_at DESC`,
      [childId]
    );

    const scoresMap = {};
    for (const r of marksRes.rows) {
      const sub = (r.subject || '').toLowerCase();
      const pct = r.percentage ? Number(r.percentage) : Math.round((Number(r.score) / (Number(r.max_score) || 100)) * 100);
      
      if (!scoresMap[sub]) scoresMap[sub] = pct;
    }

    const payload = {
      math_score: scoresMap['mathematics'] || scoresMap['maths'] || scoresMap['math'] || 75,
      physics_score: scoresMap['physical sciences'] || scoresMap['physics'] || 72,
      chemistry_score: scoresMap['chemistry'] || scoresMap['physical sciences'] || 70,
      biology_score: scoresMap['life sciences'] || scoresMap['biology'] || 74,
      english_score: scoresMap['english fal'] || scoresMap['english'] || scoresMap['home language'] || 78,
      history_score: scoresMap['history'] || scoresMap['social sciences'] || 70,
      geography_score: scoresMap['geography'] || 70,
      absence_days: parseInt(learner.absences, 10) || 2,
      weekly_self_study_hours: 18,
      extracurricular_activities: 1
    };

    const aiResult = await aiAdvisorService.predictStudent(payload);
    res.json({
      success: true,
      learner: {
        id: learner.id,
        name: `${learner.full_name} ${learner.surname}`.trim(),
        grade: learner.grade
      },
      ...aiResult
    });
  } catch (err) {
    console.error('Error fetching learner AI prediction:', err);
    res.status(500).json({ error: 'Could not compute learner prediction.' });
  }
});

// =========================================================================
// GELEZA SA MULTI-SCHOOL PERFORMANCE FACTOR ENDPOINTS
// =========================================================================

/**
 * POST /api/ai-advisor/geleza/predict
 * Generates continuous exam mark projection, balanced risk tier, and nudges
 */
router.post('/geleza/predict', async (req, res) => {
  try {
    const result = await aiAdvisorService.predictGelezaPerformance(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error running Geleza performance prediction:', err);
    res.status(500).json({ success: false, error: 'Failed to generate Geleza performance prediction.' });
  }
});

/**
 * POST /api/ai-advisor/geleza/simulate
 * What-If Study Simulator: Compares baseline student parameters against simulated adjustments
 */
router.post('/geleza/simulate', async (req, res) => {
  try {
    const { baseline = {}, adjustments = {} } = req.body;
    const result = await aiAdvisorService.simulateGelezaStudyImpact(baseline, adjustments);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error running Geleza study simulation:', err);
    res.status(500).json({ success: false, error: 'Failed to run study simulation.' });
  }
});

/**
 * POST /api/ai-advisor/geleza/batch
 * Batch predictions for class rosters or grade-wide cohorts
 */
router.post('/geleza/batch', async (req, res) => {
  try {
    const students = Array.isArray(req.body.students) ? req.body.students : req.body;
    const results = await aiAdvisorService.predictGelezaBatch(students);
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    console.error('Error running Geleza batch prediction:', err);
    res.status(500).json({ success: false, error: 'Failed to generate batch predictions.' });
  }
});

/**
 * GET /api/ai-advisor/geleza/metrics
 * Returns model health, accuracy, balanced confusion matrix, and disparate impact parity
 */
router.get('/geleza/metrics', (req, res) => {
  try {
    const metrics = aiAdvisorService.getGelezaModelMetrics();
    res.json({ success: true, ...metrics });
  } catch (err) {
    console.error('Error fetching Geleza model metrics:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve model metrics.' });
  }
});

/**
 * GET /api/ai-advisor/geleza/learner/:childId
 * Automatic performance factor prediction using database marks and attendance percentage
 */
router.get('/geleza/learner/:childId', async (req, res) => {
  try {
    const { childId } = req.params;

    // 1. Fetch learner information, school, user gender, & attendance stats
    const learnerRes = await db.query(
      `SELECT c.id, c.full_name, c.surname, c.grade, c.school_id,
              COALESCE(u.gender, 'Male') as gender,
              COALESCE(s.school_type, 'Public') as school_type,
              (SELECT COUNT(*) FROM attendance WHERE child_id = c.id) as total_attendance_records,
              (SELECT COUNT(*) FROM attendance WHERE child_id = c.id AND status = 'present') as present_days,
              (SELECT COUNT(*) FROM attendance WHERE child_id = c.id AND status = 'absent') as absent_days
       FROM children c
       LEFT JOIN users u ON c.learner_user_id = u.id
       LEFT JOIN schools s ON c.school_id = s.id
       WHERE c.id = $1 LIMIT 1`,
      [childId]
    );

    if (learnerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Learner not found' });
    }

    const learner = learnerRes.rows[0];

    // Compute Attendance %
    const totalRecords = parseInt(learner.total_attendance_records, 10) || 0;
    const presentDays = parseInt(learner.present_days, 10) || 0;
    const attendancePct = totalRecords > 0 ? Math.round((presentDays / totalRecords) * 100) : 85;

    // 2. Fetch latest academic marks
    const marksRes = await db.query(
      `SELECT score, max_score, percentage 
       FROM marks 
       WHERE child_id = $1 OR learner_id = $1
       ORDER BY recorded_at DESC LIMIT 15`,
      [childId]
    );

    let avgScore = 68;
    if (marksRes.rows.length > 0) {
      const pcts = marksRes.rows.map(r => r.percentage ? Number(r.percentage) : Math.round((Number(r.score) / (Number(r.max_score) || 100)) * 100));
      avgScore = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    }

    // 3. Fetch custom learner profile factors if saved
    const profileRes = await db.query(
      `SELECT * FROM learner_performance_profiles WHERE child_id = $1 LIMIT 1`,
      [childId]
    );
    const prof = profileRes.rows[0] || {};

    // 4. Construct Geleza payload with database values
    const payload = {
      Hours_Studied: Number(req.query.hours_studied) || Number(prof.weekly_hours_studied) || 18,
      Attendance: attendancePct,
      Parental_Involvement: req.query.parental_involvement || prof.parental_involvement || 'Medium',
      Access_to_Resources: req.query.access_to_resources || prof.access_to_resources || 'Medium',
      Extracurricular_Activities: req.query.extracurricular || 'Yes',
      Previous_Scores: avgScore,
      Motivation_Level: req.query.motivation || prof.motivation_level || 'Medium',
      Internet_Access: req.query.internet_access !== undefined ? req.query.internet_access : (prof.internet_access !== undefined ? (prof.internet_access ? 'Yes' : 'No') : 'Yes'),
      Tutoring_Sessions: Number(req.query.tutoring_sessions) || Number(prof.tutoring_sessions) || 1,
      Family_Income: req.query.family_income || prof.family_income || 'Medium',
      Teacher_Quality: req.query.teacher_quality || prof.teacher_quality || 'High',
      School_Type: learner.school_type || 'Public',
      Peer_Influence: req.query.peer_influence || prof.peer_influence || 'Positive',
      Learning_Disabilities: prof.learning_disabilities ? 'Yes' : 'No',
      Parental_Education_Level: req.query.parental_education || prof.parental_education_level || 'High School',
      Distance_from_Home: req.query.distance || prof.distance_from_home || 'Near',
      Gender: (learner.gender || 'Male').toLowerCase() === 'female' ? 'Female' : 'Male'
    };

    const prediction = await aiAdvisorService.predictGelezaPerformance(payload);

    res.json({
      success: true,
      learner: {
        id: learner.id,
        name: `${learner.full_name} ${learner.surname}`.trim(),
        grade: learner.grade,
        school_id: learner.school_id,
        calculated_attendance_pct: attendancePct,
        calculated_previous_average: avgScore
      },
      inputs_used: payload,
      prediction
    });
  } catch (err) {
    console.error('Error generating learner Geleza prediction:', err);
    res.status(500).json({ success: false, error: 'Could not compute learner performance prediction.' });
  }
});

/**
 * POST /api/ai-advisor/geleza/learner/:childId/evaluate-and-save
 * Generates and permanently saves a term prediction snapshot to ai_performance_predictions
 */
router.post('/geleza/learner/:childId/evaluate-and-save', async (req, res) => {
  try {
    const { childId } = req.params;
    const { term = 1, academic_year = 2026, user_id } = req.body;

    // Fetch learner and compute factors
    const learnerRes = await db.query(
      `SELECT c.id, c.school_id, c.full_name, c.surname, c.grade,
              COALESCE(u.gender, 'Male') as gender,
              COALESCE(s.school_type, 'Public') as school_type,
              (SELECT COUNT(*) FROM attendance WHERE child_id = c.id) as total_attendance,
              (SELECT COUNT(*) FROM attendance WHERE child_id = c.id AND status = 'present') as present_days
       FROM children c
       LEFT JOIN users u ON c.learner_user_id = u.id
       LEFT JOIN schools s ON c.school_id = s.id
       WHERE c.id = $1 LIMIT 1`,
      [childId]
    );

    if (learnerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Learner not found' });
    }

    const learner = learnerRes.rows[0];
    const totalAtt = parseInt(learner.total_attendance, 10) || 0;
    const presAtt = parseInt(learner.present_days, 10) || 0;
    const attendancePct = totalAtt > 0 ? Math.round((presAtt / totalAtt) * 100) : 85;

    // Marks average
    const marksRes = await db.query(
      `SELECT score, max_score, percentage FROM marks WHERE child_id = $1 OR learner_id = $1 ORDER BY recorded_at DESC LIMIT 15`,
      [childId]
    );
    let avgScore = 68;
    if (marksRes.rows.length > 0) {
      const pcts = marksRes.rows.map(r => r.percentage ? Number(r.percentage) : Math.round((Number(r.score) / (Number(r.max_score) || 100)) * 100));
      avgScore = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    }

    // Profile
    const profRes = await db.query(`SELECT * FROM learner_performance_profiles WHERE child_id = $1 LIMIT 1`, [childId]);
    const prof = profRes.rows[0] || {};

    const payload = {
      Attendance: attendancePct,
      Hours_Studied: Number(req.body.hours_studied) || Number(prof.weekly_hours_studied) || 18,
      Access_to_Resources: req.body.access_to_resources || prof.access_to_resources || 'Medium',
      Previous_Scores: avgScore,
      Parental_Involvement: req.body.parental_involvement || prof.parental_involvement || 'Medium',
      Tutoring_Sessions: Number(req.body.tutoring_sessions) || Number(prof.tutoring_sessions) || 1
    };

    const prediction = await aiAdvisorService.predictGelezaPerformance(payload);

    // Verify school_id against schools table before insertion
    const schoolCheck = learner.school_id ? await db.query('SELECT 1 FROM schools WHERE id = $1', [learner.school_id]) : { rows: [] };
    const safeSchoolId = schoolCheck.rows.length > 0 ? learner.school_id : null;

    // Save snapshot to ai_performance_predictions
    const insertRes = await db.query(
      `INSERT INTO ai_performance_predictions
       (child_id, school_id, academic_year, term, predicted_score, risk_tier_id, risk_tier_label, risk_tier_color, confidence_probabilities, actionable_nudges, features_snapshot, evaluated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, created_at`,
      [
        childId,
        safeSchoolId,
        academic_year,
        term,
        prediction.predicted_score,
        prediction.risk_tier.id,
        prediction.risk_tier.label,
        prediction.risk_tier.color,
        JSON.stringify(prediction.risk_tier.probabilities),
        prediction.actionable_nudges,
        JSON.stringify(payload),
        user_id || null
      ]
    );

    res.json({
      success: true,
      saved_prediction_id: insertRes.rows[0].id,
      evaluated_at: insertRes.rows[0].created_at,
      prediction
    });
  } catch (err) {
    console.error('Error in evaluate-and-save:', err);
    res.status(500).json({ success: false, error: 'Failed to evaluate and persist prediction.' });
  }
});

/**
 * GET /api/ai-advisor/geleza/learner/:childId/history
 * Retrieves chronological prediction history and performance trajectory for a learner
 */
router.get('/geleza/learner/:childId/history', async (req, res) => {
  try {
    const { childId } = req.params;
    const historyRes = await db.query(
      `SELECT id, academic_year, term, predicted_score, risk_tier_id, risk_tier_label, risk_tier_color,
              confidence_probabilities, actionable_nudges, created_at
       FROM ai_performance_predictions
       WHERE child_id = $1
       ORDER BY academic_year DESC, term DESC, created_at DESC`,
      [childId]
    );

    res.json({
      success: true,
      child_id: childId,
      total_snapshots: historyRes.rows.length,
      history: historyRes.rows
    });
  } catch (err) {
    console.error('Error fetching prediction history:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve prediction history.' });
  }
});

/**
 * GET /api/ai-advisor/geleza/school/:schoolId/early-warning
 * School-wide or class-level triage table: groups students by risk tier
 */
router.get('/geleza/school/:schoolId/early-warning', async (req, res) => {
  try {
    const { schoolId } = req.params;
    const grade = req.query.grade ? parseInt(req.query.grade, 10) : null;

    let query = `
      SELECT DISTINCT ON (c.id)
        c.id as child_id,
        c.full_name,
        c.surname,
        c.grade,
        c.learner_number,
        p.predicted_score,
        p.risk_tier_id,
        p.risk_tier_label,
        p.risk_tier_color,
        p.actionable_nudges,
        p.created_at as last_assessed_at
      FROM children c
      LEFT JOIN ai_performance_predictions p ON c.id = p.child_id
      WHERE c.school_id = $1
    `;
    const params = [schoolId];

    if (grade) {
      params.push(grade);
      query += ` AND c.grade = $${params.length}`;
    }

    query += ` ORDER BY c.id, p.created_at DESC NULLS LAST`;

    const result = await db.query(query, params);

    // Group by tiers
    const summary = {
      priority_support: [],
      core_progress: [],
      high_achiever: [],
      unassessed: []
    };

    for (const row of result.rows) {
      const band = aiAdvisorService.scoreSupportBand(row.predicted_score);
      if (!band) {
        summary.unassessed.push(row);
        continue;
      }
      row.risk_tier_id = band.id;
      row.risk_tier_label = band.label;
      row.risk_tier_color = band.color;
      if (band.id === 0) summary.priority_support.push(row);
      else if (band.id === 1) summary.core_progress.push(row);
      else summary.high_achiever.push(row);
    }

    res.json({
      success: true,
      school_id: schoolId,
      total_learners: result.rows.length,
      counts: {
        priority_support: summary.priority_support.length,
        core_progress: summary.core_progress.length,
        high_achiever: summary.high_achiever.length,
        unassessed: summary.unassessed.length
      },
      summary
    });
  } catch (err) {
    console.error('Error fetching school early warning radar:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve early warning radar.' });
  }
});

/**
 * GET /api/ai-advisor/geleza/profile/:childId
 * Retrieves learner's study and environmental factors
 */
router.get('/geleza/profile/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    const profileRes = await db.query(
      `SELECT * FROM learner_performance_profiles WHERE child_id = $1 LIMIT 1`,
      [childId]
    );

    if (profileRes.rows.length === 0) {
      // Return sensible defaults if profile hasn't been explicitly created yet
      return res.json({
        success: true,
        child_id: childId,
        is_default: true,
        profile: {
          weekly_hours_studied: 18.0,
          tutoring_sessions: 1,
          access_to_resources: 'Medium',
          internet_access: true,
          motivation_level: 'Medium',
          peer_influence: 'Positive',
          family_income: 'Medium',
          learning_disabilities: false,
          parental_involvement: 'Medium',
          parental_education_level: 'High School',
          distance_from_home: 'Near',
          teacher_quality: 'High'
        }
      });
    }

    res.json({
      success: true,
      child_id: childId,
      is_default: false,
      profile: profileRes.rows[0]
    });
  } catch (err) {
    console.error('Error fetching learner profile:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve learner profile.' });
  }
});

/**
 * PUT /api/ai-advisor/geleza/profile/:childId
 * Allows learner, parent, or counselor to update study parameters
 */
router.put('/geleza/profile/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    const {
      weekly_hours_studied = 18.0,
      tutoring_sessions = 1,
      access_to_resources = 'Medium',
      internet_access = true,
      motivation_level = 'Medium',
      peer_influence = 'Positive',
      family_income = 'Medium',
      learning_disabilities = false,
      parental_involvement = 'Medium',
      parental_education_level = 'High School',
      distance_from_home = 'Near',
      teacher_quality = 'High',
      notes = null
    } = req.body;

    const upsertRes = await db.query(
      `INSERT INTO learner_performance_profiles
       (child_id, weekly_hours_studied, tutoring_sessions, access_to_resources, internet_access,
        motivation_level, peer_influence, family_income, learning_disabilities,
        parental_involvement, parental_education_level, distance_from_home, teacher_quality, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
       ON CONFLICT (child_id) DO UPDATE
       SET weekly_hours_studied = EXCLUDED.weekly_hours_studied,
           tutoring_sessions = EXCLUDED.tutoring_sessions,
           access_to_resources = EXCLUDED.access_to_resources,
           internet_access = EXCLUDED.internet_access,
           motivation_level = EXCLUDED.motivation_level,
           peer_influence = EXCLUDED.peer_influence,
           family_income = EXCLUDED.family_income,
           learning_disabilities = EXCLUDED.learning_disabilities,
           parental_involvement = EXCLUDED.parental_involvement,
           parental_education_level = EXCLUDED.parental_education_level,
           distance_from_home = EXCLUDED.distance_from_home,
           teacher_quality = EXCLUDED.teacher_quality,
           notes = EXCLUDED.notes,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        childId, weekly_hours_studied, tutoring_sessions, access_to_resources, internet_access,
        motivation_level, peer_influence, family_income, learning_disabilities,
        parental_involvement, parental_education_level, distance_from_home, teacher_quality, notes
      ]
    );

    res.json({
      success: true,
      message: 'Learner performance profile updated successfully.',
      profile: upsertRes.rows[0]
    });
  } catch (err) {
    console.error('Error updating learner profile:', err);
    res.status(500).json({ success: false, error: 'Failed to update learner profile.' });
  }
});

/**
 * POST /api/ai-advisor/geleza/evaluate-cohort
 * One-click batch evaluation: Evaluates an entire grade or class roster, saves snapshots,
 * and returns summary metrics
 */
router.post('/geleza/evaluate-cohort', async (req, res) => {
  try {
    const { school_id = 1, grade, class_id, term = 1, academic_year = 2026, user_id } = req.body;

    let query = `
      SELECT c.id, c.school_id, c.full_name, c.surname, c.grade, c.class_id,
             COALESCE(u.gender, 'Male') as gender,
             COALESCE(s.school_type, 'Public') as school_type,
             (SELECT COUNT(*) FROM attendance WHERE child_id = c.id) as total_attendance,
             (SELECT COUNT(*) FROM attendance WHERE child_id = c.id AND status = 'present') as present_days,
             p.weekly_hours_studied, p.tutoring_sessions, p.access_to_resources, p.internet_access,
             p.motivation_level, p.peer_influence, p.family_income, p.learning_disabilities,
             p.parental_involvement, p.parental_education_level, p.distance_from_home, p.teacher_quality
      FROM children c
      LEFT JOIN users u ON c.learner_user_id = u.id
      LEFT JOIN schools s ON c.school_id = s.id
      LEFT JOIN learner_performance_profiles p ON c.id = p.child_id
      WHERE c.school_id = $1
    `;
    const params = [school_id];

    if (grade) {
      params.push(grade);
      query += ` AND c.grade = $${params.length}`;
    }
    if (class_id) {
      params.push(class_id);
      query += ` AND c.class_id = $${params.length}`;
    }

    const learnersRes = await db.query(query, params);
    if (learnersRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No learners found matching criteria.' });
    }

    const learners = learnersRes.rows;

    // Fetch marks averages for all learners in one query
    const marksRes = await db.query(
      `SELECT learner_id, AVG(percentage) as avg_score
       FROM marks
       WHERE learner_id = ANY($1)
       GROUP BY learner_id`,
      [learners.map(l => l.id)]
    );
    const marksMap = {};
    for (const m of marksRes.rows) {
      marksMap[m.learner_id] = Math.round(Number(m.avg_score) || 68);
    }

    // Build payload list for python batch prediction
    const studentPayloads = learners.map(l => {
      const totalAtt = parseInt(l.total_attendance, 10) || 0;
      const presAtt = parseInt(l.present_days, 10) || 0;
      const attPct = totalAtt > 0 ? Math.round((presAtt / totalAtt) * 100) : 85;

      return {
        Attendance: attPct,
        Hours_Studied: Number(l.weekly_hours_studied) || 18,
        Access_to_Resources: l.access_to_resources || 'Medium',
        Previous_Scores: marksMap[l.id] || 68,
        Parental_Involvement: l.parental_involvement || 'Medium',
        Tutoring_Sessions: Number(l.tutoring_sessions) || 1
      };
    });

    // Execute batch prediction in Python
    const predictions = await aiAdvisorService.predictGelezaBatch(studentPayloads);

    // Save all predictions in a transaction
    const savedSnapshots = [];
    const counts = { priority_support: 0, core_progress: 0, high_achiever: 0 };

    for (let i = 0; i < learners.length; i++) {
      const learner = learners[i];
      const pred = predictions[i];
      const payload = studentPayloads[i];

      if (pred.risk_tier.id === 0) counts.priority_support++;
      else if (pred.risk_tier.id === 1) counts.core_progress++;
      else if (pred.risk_tier.id === 2) counts.high_achiever++;

      const schoolCheck = learner.school_id ? await db.query('SELECT 1 FROM schools WHERE id = $1', [learner.school_id]) : { rows: [] };
      const safeSchoolId = schoolCheck.rows.length > 0 ? learner.school_id : null;

      const ins = await db.query(
        `INSERT INTO ai_performance_predictions
         (child_id, school_id, academic_year, term, predicted_score, risk_tier_id,
          risk_tier_label, risk_tier_color, confidence_probabilities, actionable_nudges,
          features_snapshot, evaluated_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          learner.id,
          safeSchoolId,
          academic_year,
          term,
          pred.predicted_score,
          pred.risk_tier.id,
          pred.risk_tier.label,
          pred.risk_tier.color,
          JSON.stringify(pred.risk_tier.probabilities),
          pred.actionable_nudges,
          JSON.stringify(payload),
          user_id || null
        ]
      );
      savedSnapshots.push({
        child_id: learner.id,
        name: `${learner.full_name} ${learner.surname}`,
        predicted_score: pred.predicted_score,
        risk_tier: pred.risk_tier,
        snapshot_id: ins.rows[0].id
      });
    }

    res.json({
      success: true,
      message: `Successfully evaluated and saved ${learners.length} learner predictions.`,
      evaluated_count: learners.length,
      counts,
      evaluated_cohort: savedSnapshots
    });
  } catch (err) {
    console.error('Error during cohort evaluation:', err);
    res.status(500).json({ success: false, error: 'Failed to evaluate cohort.' });
  }
});

/**
 * POST /api/ai-advisor/geleza/job/run-audit
 * Manually triggers the automated background risk audit on-demand
 */
router.post('/geleza/job/run-audit', async (req, res) => {
  try {
    const { school_id, grade, term, academic_year, force_alert, dry_run } = req.body;
    const result = await gelezaEarlyWarningJob.runRiskAudit({
      schoolId: school_id ? parseInt(school_id, 10) : null,
      grade: grade && grade !== 'all' ? parseInt(grade, 10) : null,
      term: term ? parseInt(term, 10) : 1,
      academicYear: academic_year ? parseInt(academic_year, 10) : 2026,
      forceAlert: force_alert === true,
      dryRun: dry_run === true,
      triggeredBy: req.user?.id ? `user_${req.user.id}` : 'manual_api'
    });
    res.json(result);
  } catch (err) {
    console.error('Error triggering risk audit job:', err);
    res.status(500).json({ success: false, error: 'Failed to run risk audit.' });
  }
});

/**
 * GET /api/ai-advisor/geleza/job/status
 * Returns current status and recent history of the risk audit job
 */
router.get('/geleza/job/status', (req, res) => {
  res.json({
    success: true,
    ...gelezaEarlyWarningJob.getJobStatus()
  });
});

/**
 * GET /api/ai-advisor/geleza/job/alerts
 * Returns recent academic risk early warning alerts dispatched to educators
 */
router.get('/geleza/job/alerts', async (req, res) => {
  try {
    const { school_id, limit = 50 } = req.query;
    let q = `
      SELECT p.id, p.child_id, p.school_id, p.predicted_score, p.risk_tier_id,
             p.risk_tier_label, p.actionable_nudges, p.alert_dispatched_at, p.alert_severity,
             c.full_name, c.surname, c.grade, c.learner_number
      FROM ai_performance_predictions p
      JOIN children c ON p.child_id = c.id
      WHERE p.alert_dispatched_at IS NOT NULL
    `;
    const params = [];
    if (school_id) {
      params.push(parseInt(school_id, 10));
      q += ` AND p.school_id = $${params.length}`;
    }
    q += ` ORDER BY p.alert_dispatched_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit, 10) || 50);

    const alertsRes = await db.query(q, params);
    res.json({
      success: true,
      count: alertsRes.rows.length,
      alerts: alertsRes.rows
    });
  } catch (err) {
    console.error('Error fetching job alerts history:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts.' });
  }
});

module.exports = router;
