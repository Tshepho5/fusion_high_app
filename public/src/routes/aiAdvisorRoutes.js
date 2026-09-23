/**
 * AI Advisor Routes
 * Option A API endpoints for Student Career Recommendations & Academic Risk Monitoring
 */

const express = require('express');
const router = express.Router();
const aiAdvisorService = require('../services/aiAdvisorService');
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

module.exports = router;
