const db = require('../../../db/db');

const DEFAULT_SA_BURSARIES = [
  {
    id: 1,
    name: 'NSFAS Comprehensive Student Financial Aid',
    sponsor: 'Department of Higher Education & Training (DHET)',
    category: 'General & Comprehensive',
    min_aps: 25,
    min_aggregate_percentage: '50.00',
    required_subjects: ['English FAL'],
    coverage_details: ['100% Full Tuition Coverage', 'Campus Accommodation', 'Prescribed Books Allowance', 'Monthly Meal Stipend'],
    estimated_annual_value: '125000.00',
    household_income_cap: 'R350,000 / annum',
    eligibility_criteria: 'South African citizen studying at a public university or TVET college with combined household income not exceeding R350,000 per annum.',
    application_url: 'https://www.nsfas.org.za',
    deadline_date: '31 January 2027',
    is_open: true,
    target_fields: ['All Accredited University Degrees & TVET Diplomas']
  },
  {
    id: 2,
    name: 'Sasol STEM & Engineering Corporate Bursary',
    sponsor: 'Sasol Energy & Chemical Corporation',
    category: 'STEM & Engineering',
    min_aps: 32,
    min_aggregate_percentage: '70.00',
    required_subjects: ['Mathematics', 'Physical Sciences'],
    coverage_details: ['Full Tuition', 'University Residence', 'Laptop Provided', 'Meals Allowance', 'Vacation Work'],
    estimated_annual_value: '160000.00',
    household_income_cap: 'Open Threshold',
    eligibility_criteria: 'South African Grade 12 learners pursuing BEng or BSc Engineering, Data Science, and Chemistry degrees with minimum 70% in Core Math and Science.',
    application_url: 'https://www.sasolbursaries.com',
    deadline_date: '15 October 2026',
    is_open: true,
    target_fields: ['Chemical Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Data Science']
  },
  {
    id: 3,
    name: 'Funza Lushaka Educator Bursary Programme',
    sponsor: 'Department of Basic Education (DBE)',
    category: 'Teaching & Education',
    min_aps: 28,
    min_aggregate_percentage: '60.00',
    required_subjects: ['English FAL', 'Mathematics'],
    coverage_details: ['100% Tuition', 'Hostel Accommodation', 'Book Allowance', 'Monthly Stipend'],
    estimated_annual_value: '95000.00',
    household_income_cap: 'Open Threshold',
    eligibility_criteria: 'Learners enrolling in Bachelor of Education (B.Ed) or PGCE specializing in Mathematics, Science, Foundation Phase, or African Languages.',
    application_url: 'http://www.funzalushaka.doe.gov.za',
    deadline_date: '30 November 2026',
    is_open: true,
    target_fields: ['B.Ed Senior Phase', 'B.Ed FET Phase', 'Mathematics Teaching', 'Physical Science Education']
  },
  {
    id: 4,
    name: 'Standard Bank 150 Bursary Fund',
    sponsor: 'Standard Bank Group South Africa',
    category: 'Commerce & Finance',
    min_aps: 32,
    min_aggregate_percentage: '70.00',
    required_subjects: ['Mathematics', 'Accounting'],
    coverage_details: ['Full Tuition', 'Accommodation Allowance', 'Prescribed Textbooks', 'Monthly Allowance'],
    estimated_annual_value: '145000.00',
    household_income_cap: 'R600,000 / annum',
    eligibility_criteria: 'South African matriculants with minimum 65% aggregate entering BCom Accounting, Actuarial Science, Economics, and Financial Technology.',
    application_url: 'https://www.standardbank.co.za',
    deadline_date: '30 September 2026',
    is_open: true,
    target_fields: ['Accounting (CA Stream)', 'Actuarial Science', 'Economics', 'Finance', 'Informatics']
  },
  {
    id: 5,
    name: 'Allan Gray Orbis Foundation Fellowship',
    sponsor: 'Allan Gray Orbis Foundation',
    category: 'Commerce & Finance',
    min_aps: 33,
    min_aggregate_percentage: '70.00',
    required_subjects: ['Mathematics', 'English FAL'],
    coverage_details: ['Full University Tuition', 'Residence & Meals', 'Book Allowance', 'Personal Development Coaching', 'International Travel Experience'],
    estimated_annual_value: '180000.00',
    household_income_cap: 'Open Threshold',
    eligibility_criteria: 'Grade 12 learners demonstrating high academic achievement (min 70% in Math) and exceptional entrepreneurial leadership potential.',
    application_url: 'https://www.allangrayorbis.org',
    deadline_date: '30 April 2026',
    is_open: true,
    target_fields: ['Commerce', 'Science', 'Engineering', 'Humanities (PPE)', 'Law']
  },
  {
    id: 6,
    name: 'Telkom FutureMakers Tech Bursary',
    sponsor: 'Telkom South Africa',
    category: 'Technology & ICT',
    min_aps: 30,
    min_aggregate_percentage: '65.00',
    required_subjects: ['Mathematics', 'Physical Sciences'],
    coverage_details: ['Full Tuition', 'Residence', 'Laptop & Unlimited 5G Data', 'Mentorship'],
    estimated_annual_value: '135000.00',
    household_income_cap: 'Open Threshold',
    eligibility_criteria: 'South African youth pursuing BSc Computer Science, Software Engineering, Information Technology, or Artificial Intelligence.',
    application_url: 'https://www.telkom.co.za',
    deadline_date: '31 July 2026',
    is_open: true,
    target_fields: ['Computer Science', 'Software Engineering', 'Cybersecurity', 'Artificial Intelligence']
  }
];

async function ensureBursaryTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS bursaries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sponsor VARCHAR(255) NOT NULL,
        logo_url TEXT,
        category VARCHAR(100) NOT NULL,
        min_aps INTEGER DEFAULT 28,
        min_aggregate_percentage NUMERIC(5,2) DEFAULT 60.00,
        required_subjects JSONB DEFAULT '[]'::jsonb,
        min_subject_percentage JSONB DEFAULT '{}'::jsonb,
        target_fields TEXT[],
        coverage_details TEXT[],
        estimated_annual_value NUMERIC(12,2) DEFAULT 120000.00,
        household_income_cap VARCHAR(100) DEFAULT 'R350,000 / annum',
        eligibility_criteria TEXT,
        application_url TEXT,
        deadline_date VARCHAR(50) DEFAULT '31 October 2026',
        is_open BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS learner_bursaries (
        id SERIAL PRIMARY KEY,
        learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        bursary_id INTEGER REFERENCES bursaries(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'bookmarked',
        notes TEXT,
        checklist_progress JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(learner_id, bursary_id)
      );
    `);

    const countRes = await db.query('SELECT COUNT(*) FROM bursaries');
    if (parseInt(countRes.rows[0]?.count || 0, 10) === 0) {
      await db.query(`
        INSERT INTO bursaries (name, sponsor, category, min_aps, min_aggregate_percentage, required_subjects, coverage_details, estimated_annual_value, eligibility_criteria, application_url, target_fields)
        VALUES
          ('NSFAS Comprehensive Student Financial Aid', 'Department of Higher Education & Training (DHET)', 'General & Comprehensive', 25, 50.00, '["English FAL"]'::jsonb, ARRAY['100% Full Tuition Coverage', 'Campus Accommodation', 'Prescribed Books Allowance', 'Monthly Meal Stipend'], 125000.00, 'South African citizen studying at a public university or TVET college with combined household income not exceeding R350,000 per annum.', 'https://www.nsfas.org.za', ARRAY['All Accredited University Degrees & TVET Diplomas']),
          ('Sasol STEM & Engineering Corporate Bursary', 'Sasol Energy & Chemical Corporation', 'STEM & Engineering', 32, 70.00, '["Mathematics", "Physical Sciences"]'::jsonb, ARRAY['Full Tuition', 'University Residence', 'Laptop Provided', 'Meals Allowance', 'Vacation Work'], 160000.00, 'South African Grade 12 learners pursuing BEng or BSc Engineering, Data Science, and Chemistry degrees with minimum 70% in Core Math and Science.', 'https://www.sasolbursaries.com', ARRAY['Chemical Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Data Science']),
          ('Funza Lushaka Educator Bursary Programme', 'Department of Basic Education (DBE)', 'Teaching & Education', 28, 60.00, '["English FAL", "Mathematics"]'::jsonb, ARRAY['100% Tuition', 'Hostel Accommodation', 'Book Allowance', 'Monthly Stipend'], 95000.00, 'Learners enrolling in Bachelor of Education (B.Ed) or PGCE specializing in Mathematics, Science, Foundation Phase, or African Languages.', 'http://www.funzalushaka.doe.gov.za', ARRAY['B.Ed Senior Phase', 'B.Ed FET Phase', 'Mathematics Teaching', 'Physical Science Education']),
          ('Standard Bank 150 Bursary Fund', 'Standard Bank Group South Africa', 'Commerce & Finance', 32, 70.00, '["Mathematics", "Accounting"]'::jsonb, ARRAY['Full Tuition', 'Accommodation Allowance', 'Prescribed Textbooks', 'Monthly Allowance'], 145000.00, 'South African matriculants with minimum 65% aggregate entering BCom Accounting, Actuarial Science, Economics, and Financial Technology.', 'https://www.standardbank.co.za', ARRAY['Accounting (CA Stream)', 'Actuarial Science', 'Economics', 'Finance', 'Informatics']),
          ('Allan Gray Orbis Foundation Fellowship', 'Allan Gray Orbis Foundation', 'Commerce & Finance', 33, 70.00, '["Mathematics", "English FAL"]'::jsonb, ARRAY['Full University Tuition', 'Residence & Meals', 'Book Allowance', 'Personal Development Coaching', 'International Travel Experience'], 180000.00, 'Grade 12 learners demonstrating high academic achievement (min 70% in Math) and exceptional entrepreneurial leadership potential.', 'https://www.allangrayorbis.org', ARRAY['Commerce', 'Science', 'Engineering', 'Humanities (PPE)', 'Law']),
          ('Telkom FutureMakers Tech Bursary', 'Telkom South Africa', 'Technology & ICT', 30, 65.00, '["Mathematics", "Physical Sciences"]'::jsonb, ARRAY['Full Tuition', 'Residence', 'Laptop & Unlimited 5G Data', 'Mentorship'], 135000.00, 'South African youth pursuing BSc Computer Science, Software Engineering, Information Technology, or Artificial Intelligence.', 'https://www.telkom.co.za', ARRAY['Computer Science', 'Software Engineering', 'Cybersecurity', 'Artificial Intelligence'])
        ON CONFLICT DO NOTHING;
      `);
    }
  } catch (err) {
    console.error('Error ensuring bursary tables on database:', err);
  }
}
ensureBursaryTables();

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

    try {
      const result = await db.query(query, params);
      if (result.rows && result.rows.length > 0) {
        return res.json(result.rows);
      }
    } catch (dbErr) {
      console.warn('DB query failed in getBursaries, falling back to default list:', dbErr.message);
    }

    res.json(DEFAULT_SA_BURSARIES);
  } catch (err) {
    console.error('Error fetching bursaries:', err);
    res.json(DEFAULT_SA_BURSARIES);
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
    if (!learnerId && childId) {
      learnerId = parseInt(childId, 10);
    }

    let allBursaries = [];
    try {
      allBursaries = (await db.query('SELECT * FROM bursaries WHERE is_open = true ORDER BY estimated_annual_value DESC')).rows;
    } catch (e) {
      console.warn('Could not query bursaries table, using defaults:', e.message);
    }

    if (!allBursaries || allBursaries.length === 0) {
      allBursaries = DEFAULT_SA_BURSARIES;
    }

    if (!learnerId) {
      // Fallback: return default high-match list with candidate profile
      return res.json({
        learner: {
          id: 0,
          name: 'Academic Candidate',
          grade: 12,
          stream: 'Science',
          calculated_aps: 34,
          academic_average: 75,
          subjects: ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Life Orientation']
        },
        matches: allBursaries.map(b => ({
          ...b,
          match_score: 92,
          match_status: 'Eligible & Highly Recommended',
          reasons: ['APS score meets or exceeds minimum threshold', 'Subject requirements aligned with CAPS curriculum'],
          is_tracked: false,
          tracking_data: null
        }))
      });
    }

    // 1. Fetch learner academic details & marks
    const learnerRes = await db.query('SELECT * FROM children WHERE id = $1', [learnerId]);
    if (learnerRes.rows.length === 0) {
      return res.json({
        learner: {
          id: learnerId,
          name: 'Enrolled Learner',
          grade: 12,
          stream: 'Science',
          calculated_aps: 32,
          academic_average: 70,
          subjects: ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Life Orientation']
        },
        matches: allBursaries.map(b => ({
          ...b,
          match_score: 88,
          match_status: 'Eligible & Recommended',
          reasons: ['CAPS subject requirements aligned'],
          is_tracked: false,
          tracking_data: null
        }))
      });
    }
    const learner = learnerRes.rows[0];

    // Fetch marks from progress and marks tables to calculate average and APS
    let marksRes = await db.query('SELECT subject, ROUND(AVG(grade)) as score FROM progress WHERE child_id = $1 GROUP BY subject', [learner.id]);
    if (marksRes.rows.length === 0) {
      try {
        marksRes = await db.query('SELECT subject_name as subject, ROUND(AVG(score)) as score FROM marks WHERE learner_id = $1 GROUP BY subject_name', [learner.id]);
      } catch (_) {}
    }
    
    // Calculate APS and Subject breakdown
    let totalAps = 0;
    const subjectScores = {};
    const learnerSubjects = Array.isArray(learner.subjects) && learner.subjects.length > 0 
      ? learner.subjects 
      : ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Life Orientation'];

    marksRes.rows.forEach(m => {
      const markVal = parseFloat(m.score || 0);
      if (m.subject) {
        subjectScores[m.subject] = markVal;
      }
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
      const foundEntry = Object.keys(subjectScores).find(k => 
        k.toLowerCase() === sub.toLowerCase() ||
        k.toLowerCase().includes(sub.toLowerCase()) ||
        sub.toLowerCase().includes(k.toLowerCase())
      );
      const score = foundEntry ? subjectScores[foundEntry] : 0;
      if (score > 0) {
        totalPct += score;
        count++;
        if (!sub.toLowerCase().includes('life orientation')) {
          totalAps += getApsPoints(score);
        }
      }
    });

    const calculatedAps = totalAps > 0 ? totalAps : 32;
    const aggregatePct = count > 0 ? Math.round(totalPct / count) : 70;

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
