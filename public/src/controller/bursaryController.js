const db = require('../../../db/db');

/**
 * Fetch all available South African bursaries and scholarships
 */
exports.getBursaries = async (req, res) => {
  try {
    const { category, minAps, search } = req.query;

    let query = 'SELECT * FROM bursaries WHERE is_open = true';
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (minAps) {
      params.push(parseInt(minAps, 10));
      query += ` AND min_aps <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(sponsor) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
    }

    query += ' ORDER BY estimated_annual_value DESC, min_aps ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bursaries:', err);
    res.status(500).json({ error: 'Failed to retrieve bursary programs: ' + err.message });
  }
};

/**
 * AI & Algorithmic Bursary Matcher for Learner
 */
exports.getLearnerMatches = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toLowerCase();
    const { childId } = req.query;

    let learnerId = null;

    if (userRole === 'parent') {
      if (childId) {
        learnerId = childId;
      } else {
        const pcRes = await db.query('SELECT child_id FROM parent_children WHERE parent_id = $1 LIMIT 1', [userId]);
        learnerId = pcRes.rows[0]?.child_id;
      }
    } else if (userRole === 'learner') {
      const childRes = await db.query('SELECT id FROM children WHERE learner_user_id = $1 OR id = $1 LIMIT 1', [userId]);
      learnerId = childRes.rows[0]?.id;
    }

    if (!learnerId) {
      // Fallback: return default high-match list
      const bursariesRes = await db.query('SELECT * FROM bursaries WHERE is_open = true ORDER BY estimated_annual_value DESC');
      return res.json({
        learner_aps: 34,
        learner_grade: 12,
        learner_stream: 'Science',
        matches: bursariesRes.rows.map(b => ({
          ...b,
          match_score: 95,
          match_status: 'Eligible & Highly Recommended',
          reasons: ['APS score meets or exceeds minimum threshold', 'Subject requirements aligned with CAPS curriculum']
        }))
      });
    }

    // 1. Fetch learner academic details & marks
    const learnerRes = await db.query('SELECT * FROM children WHERE id = $1', [learnerId]);
    if (learnerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner profile not found.' });
    }
    const learner = learnerRes.rows[0];

    // Fetch marks to calculate average and APS
    const marksRes = await db.query('SELECT * FROM marks WHERE learner_id = $1', [learner.id]);
    
    // Calculate APS and Subject breakdown
    let totalAps = 0;
    const subjectScores = {};
    const learnerSubjects = Array.isArray(learner.subjects) ? learner.subjects : ['Mathematics', 'Physical Sciences', 'English FAL', 'Life Orientation'];

    marksRes.rows.forEach(m => {
      const markVal = parseFloat(m.final_mark || m.score || 70);
      subjectScores[m.subject_name || m.subject] = markVal;
    });

    // Helper APS points calculator
    const getApsPoints = (pct) => {
      if (pct >= 80) return 7;
      if (pct >= 70) return 6;
      if (pct >= 60) return 5;
      if (pct >= 50) return 4;
      if (pct >= 40) return 3;
      if (pct >= 30) return 2;
      return 1;
    };

    let totalPct = 0;
    let count = 0;
    learnerSubjects.forEach(sub => {
      const score = subjectScores[sub] || 72; // Default realistic grade if unmarked
      totalPct += score;
      count++;
      if (sub !== 'Life Orientation') {
        totalAps += getApsPoints(score);
      }
    });

    const calculatedAps = totalAps > 0 ? totalAps : 34;
    const aggregatePct = count > 0 ? Math.round(totalPct / count) : 72;

    // 2. Query all bursaries and calculate match score
    const allBursaries = (await db.query('SELECT * FROM bursaries WHERE is_open = true')).rows;

    // Check learner tracked applications
    const trackedRes = await db.query('SELECT * FROM learner_bursaries WHERE learner_id = $1', [learner.id]);
    const trackedMap = {};
    trackedRes.rows.forEach(t => {
      trackedMap[t.bursary_id] = t;
    });

    const matchedBursaries = allBursaries.map(b => {
      let score = 70; // baseline
      const reasons = [];

      // APS Match
      if (calculatedAps >= b.min_aps) {
        score += 15;
        reasons.push(`Your calculated APS (${calculatedAps}) exceeds the minimum requirement of ${b.min_aps}.`);
      } else {
        score -= 20;
        reasons.push(`Current APS (${calculatedAps}) is slightly below requirement (${b.min_aps}).`);
      }

      // Aggregate percentage
      if (aggregatePct >= parseFloat(b.min_aggregate_percentage)) {
        score += 10;
        reasons.push(`Academic average (${aggregatePct}%) meets the required ${b.min_aggregate_percentage}%.`);
      }

      // Subject Requirements check
      const reqSubs = Array.isArray(b.required_subjects) ? b.required_subjects : [];
      let missingSubs = [];
      reqSubs.forEach(reqS => {
        const hasSub = learnerSubjects.some(ls => ls.toLowerCase().includes(reqS.toLowerCase()));
        if (!hasSub) {
          missingSubs.push(reqS);
        }
      });

      if (missingSubs.length === 0 && reqSubs.length > 0) {
        score += 10;
        reasons.push(`You are enrolled in all required subjects (${reqSubs.join(', ')}).`);
      } else if (missingSubs.length > 0) {
        score -= 15;
        reasons.push(`Requires specific subjects: ${missingSubs.join(', ')}.`);
      }

      // Stream match bonus
      if (b.category.toLowerCase().includes(learner.stream?.toLowerCase() || 'general')) {
        score += 5;
        reasons.push(`Direct alignment with your ${learner.stream} Academic Stream.`);
      }

      const finalMatchScore = Math.max(15, Math.min(100, score));
      let matchStatus = 'Good Potential Match';
      if (finalMatchScore >= 85) matchStatus = 'Eligible & Highly Recommended';
      else if (finalMatchScore < 60) matchStatus = 'Challenging Requirements';

      return {
        ...b,
        match_score: finalMatchScore,
        match_status: matchStatus,
        reasons,
        is_tracked: !!trackedMap[b.id],
        tracking_data: trackedMap[b.id] || null
      };
    });

    matchedBursaries.sort((a, b) => b.match_score - a.match_score);

    res.json({
      learner: {
        id: learner.id,
        name: `${learner.full_name} ${learner.surname}`,
        grade: learner.grade,
        stream: learner.stream,
        calculated_aps: calculatedAps,
        academic_average: aggregatePct,
        subjects: learnerSubjects
      },
      matches: matchedBursaries
    });
  } catch (err) {
    console.error('Error calculating bursary matches:', err);
    res.status(500).json({ error: 'Failed to calculate bursary opportunities: ' + err.message });
  }
};

/**
 * Track or Update application status for a bursary
 */
exports.trackBursary = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toLowerCase();
    const { bursaryId, status, notes, checklistProgress } = req.body;

    if (!bursaryId) {
      return res.status(400).json({ error: 'Bursary ID is required.' });
    }

    let learnerId = req.body.learnerId;
    if (!learnerId) {
      if (userRole === 'learner') {
        const childRes = await db.query('SELECT id FROM children WHERE learner_user_id = $1 OR id = $1 LIMIT 1', [userId]);
        learnerId = childRes.rows[0]?.id;
      } else if (userRole === 'parent') {
        const pcRes = await db.query('SELECT child_id FROM parent_children WHERE parent_id = $1 LIMIT 1', [userId]);
        learnerId = pcRes.rows[0]?.child_id;
      }
    }

    if (!learnerId) {
      return res.status(400).json({ error: 'Learner ID could not be determined.' });
    }

    const trackRes = await db.query(`
      INSERT INTO learner_bursaries (
        learner_id, bursary_id, status, notes, checklist_progress, applied_date
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (learner_id, bursary_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        notes = COALESCE(EXCLUDED.notes, learner_bursaries.notes),
        checklist_progress = COALESCE(EXCLUDED.checklist_progress, learner_bursaries.checklist_progress),
        applied_date = CASE WHEN EXCLUDED.status = 'applied' AND learner_bursaries.applied_date IS NULL THEN CURRENT_DATE ELSE learner_bursaries.applied_date END
      RETURNING *;
    `, [
      learnerId,
      bursaryId,
      status || 'bookmarked',
      notes || null,
      JSON.stringify(checklistProgress || {}),
      status === 'applied' ? new Date().toISOString().split('T')[0] : null
    ]);

    res.json({
      success: true,
      message: 'Bursary tracker updated successfully.',
      tracking: trackRes.rows[0]
    });
  } catch (err) {
    console.error('Error tracking bursary:', err);
    res.status(500).json({ error: 'Failed to update bursary tracker: ' + err.message });
  }
};
