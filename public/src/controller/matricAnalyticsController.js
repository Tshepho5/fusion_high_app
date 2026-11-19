const db = require('../../../db/db');
const emailService = require('../services/emailService');
const academicMlService = require('../services/academicMlService');
const { evaluateRecordedSubjects } = require('../../../lib/nscEvidence');
const { resolveSchoolId } = require('../services/schoolScope');
const { teacherClassIds } = require('../../../lib/aiLearnerAccess');

/**
 * Helper: Calculate NSC Pass Category for a candidate's marks
 */
function evaluateNscPass(subjectMarks) {
  return evaluateRecordedSubjects(subjectMarks);
}

exports.getMatricProjectorStats = async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    const empty = {
      totalCandidates: 0,
      projectedPassRate: null,
      bachelorRate: null,
      diplomaRate: null,
      higherCertRate: null,
      atRiskRate: null,
      gatewayStats: [],
      candidates: [],
      official_result: false,
      message: schoolId ? 'No Grade 12 learners are available for this account.' : 'This account is not linked to a school.'
    };
    if (!schoolId) return res.json(empty);

    const role = String(req.user.role || '').toLowerCase();
    const params = [schoolId];
    let classClause = '';
    if (role === 'teacher') {
      const classIds = await teacherClassIds(db, req.user.id, schoolId);
      if (!classIds.length) return res.json(empty);
      params.push(classIds);
      classClause = ` AND c.class_id = ANY($${params.length}::int[])`;
    }

    const candidatesRes = await db.query(`
      SELECT
        c.id, c.full_name, c.surname, c.grade, c.stream, c.home_language,
        u.gender AS gender,
        c.learner_number AS candidate_number
      FROM children c
      LEFT JOIN users u ON c.learner_user_id = u.id
      WHERE c.grade = 12 AND c.school_id = $1 ${classClause}
      ORDER BY c.surname ASC, c.full_name ASC
    `, params);

    const candidates = candidatesRes.rows;

    if (candidates.length === 0) {
      return res.json(empty);
    }

    // Default sample subject matrices for CAPS Grade 12 streams
    const streamSubjects = {
      'Science': ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English First Additional Language', 'Life Orientation'],
      'Commerce': ['Accounting', 'Business Studies', 'Economics', 'Mathematical Literacy', 'English First Additional Language', 'Life Orientation'],
      'General': ['History', 'Geography', 'Mathematical Literacy', 'Tourism', 'English First Additional Language', 'Life Orientation']
    };

    // 2. Fetch all real marks recorded in database for Grade 12 candidates
    const candidateIds = candidates.map(c => c.id);
    const marksRes = await db.query(`
      SELECT child_id, subject, ROUND(AVG(grade)) as score
      FROM progress
      WHERE child_id = ANY($1::int[])
      GROUP BY child_id, subject
    `, [candidateIds]);

    const marksByChild = {};
    marksRes.rows.forEach(r => {
      if (!marksByChild[r.child_id]) marksByChild[r.child_id] = [];
      marksByChild[r.child_id].push({
        subject: r.subject,
        score: Number.isFinite(parseFloat(r.score)) ? parseFloat(r.score) : null
      });
    });

    const candidateRoster = candidates.map((cand) => {
      const stream = cand.stream || null;
      const homeLang = cand.home_language || null;
      const dbMarks = (marksByChild[cand.id] || []).filter((mark) => Number.isFinite(mark.score));
      const evaluation = evaluateNscPass(dbMarks, homeLang);

      return {
        id: cand.id,
        candidate_name: `${cand.full_name} ${cand.surname}`,
        candidate_number: cand.candidate_number,
        stream,
        home_language: homeLang,
        gender: cand.gender || 'Not Specified',
        aps_score: evaluation.apsScore,
        projected_pass: evaluation.passLevel,
        is_at_risk: evaluation.atRisk,
        failed_gateways: evaluation.failedGateways,
        interventions: evaluation.interventions,
        subject_marks: evaluation.scoredSubjects
      };
    });

    // 3. Compute Aggregated School Statistics
    const total = candidateRoster.length;
    const bachelorsCount = candidateRoster.filter(c => c.projected_pass === "Bachelor's Degree Pass").length;
    const diplomaCount = candidateRoster.filter(c => c.projected_pass === 'Diploma Pass').length;
    const higherCertCount = candidateRoster.filter(c => c.projected_pass === 'Higher Certificate Pass').length;
    const atRiskCount = candidateRoster.filter(c => c.is_at_risk).length;
    const passLevels = new Set(["Bachelor's Degree Pass", 'Diploma Pass', 'Higher Certificate Pass']);
    const passedCount = candidateRoster.filter(c => passLevels.has(c.projected_pass)).length;

    const gatewayFromRecords = (label, pattern) => {
      const scores = [];
      candidateRoster.forEach((candidate) => {
        (candidate.subject_marks || []).forEach((mark) => {
          if (pattern.test(String(mark.subject || '')) && Number.isFinite(mark.score)) scores.push(mark.score);
        });
      });
      if (!scores.length) return { subject: label, candidates_count: 0, pass_percentage: null, avg_score: null, at_risk_count: 0 };
      const below = scores.filter((score) => score < 40).length;
      return {
        subject: label,
        candidates_count: scores.length,
        pass_percentage: Math.round(((scores.length - below) / scores.length) * 100),
        avg_score: Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10,
        at_risk_count: below
      };
    };
    const gatewayStats = [
      gatewayFromRecords('Mathematics', /math/i),
      gatewayFromRecords('Physical Sciences', /physical science/i),
      gatewayFromRecords('Accounting', /accounting/i),
      gatewayFromRecords('Life Sciences', /life science/i),
      gatewayFromRecords('Home Language', /home language/i)
    ];

    res.json({
      totalCandidates: total,
      projectedPassRate: total > 0 ? Math.round((passedCount / total) * 100) : null,
      official_result: false,
      bachelorRate: Math.round((bachelorsCount / total) * 100),
      diplomaRate: Math.round((diplomaCount / total) * 100),
      higherCertRate: Math.round((higherCertCount / total) * 100),
      atRiskRate: Math.round((atRiskCount / total) * 100),
      counts: {
        bachelors: bachelorsCount,
        diploma: diplomaCount,
        higherCert: higherCertCount,
        atRisk: atRiskCount
      },
      gatewayStats,
      candidates: candidateRoster
    });
  } catch (err) {
    console.error('Error computing matric projector statistics:', err);
    res.status(500).json({ error: 'Failed to compute matric candidate analytics.' });
  }
};

/**
 * 1-Click Action: Auto-Routes all At-Risk Grade 12 Candidates into Saturday/Afternoon Remedial Clinics
 * and dispatches personalized revision pack notification emails to parents and learners.
 */
exports.autoRouteRemedial = async (req, res) => {
  try {
    const atRiskCandidatesRes = await db.query(`
      SELECT c.id, c.full_name, c.surname, c.grade, c.stream, c.home_language,
             u_l.email as learner_email, u_p.email as parent_email,
             CONCAT(u_p.full_name, ' ', u_p.surname) as parent_name
      FROM children c
      LEFT JOIN users u_l ON c.learner_user_id = u_l.id
      LEFT JOIN users u_p ON c.parent_id = u_p.id
      WHERE c.grade = 12
    `);

    let routedCount = 0;
    const focusSubjects = ['Mathematics', 'Physical Sciences', 'Accounting', 'English FAL'];

    for (const cand of atRiskCandidatesRes.rows) {
      const learnerFullName = `${cand.full_name} ${cand.surname}`;

      if (cand.parent_email) {
        emailService.sendMatricRemedialNotice({
          recipientName: cand.parent_name || 'Parent / Guardian',
          learnerName: learnerFullName,
          subjects: focusSubjects,
          clinicSchedule: 'Saturdays 08:30 - 12:30 (Maths & Physical Sciences) & Tue/Thu 15:00 - 16:30 Labs'
        }).catch(err => console.warn(`[MATRIC REMEDIAL EMAIL ERROR] Parent ${cand.parent_email}:`, err.message));
      }

      if (cand.learner_email) {
        emailService.sendMatricRemedialNotice({
          recipientName: learnerFullName,
          learnerName: learnerFullName,
          subjects: focusSubjects,
          clinicSchedule: 'Saturdays 08:30 - 12:30 & Tue/Thu Afternoon Labs'
        }).catch(err => console.warn(`[MATRIC REMEDIAL EMAIL ERROR] Learner ${cand.learner_email}:`, err.message));
      }

      routedCount++;
    }

    res.json({
      success: true,
      message: `Successfully routed ${routedCount} Grade 12 Matric candidates to intensive Saturday & Afternoon remedial clinics. Parents and learners notified via email with revision pack links!`,
      routed_count: routedCount
    });
  } catch (err) {
    console.error('Error auto-routing remedial clinics:', err);
    res.status(500).json({ error: 'Failed to auto-route remedial clinics: ' + err.message });
  }
};

/**
 * Machine Learning: Predict Single Student Academic Health & At-Risk Status
 */
exports.getMlStudentPrediction = async (req, res) => {
  try {
    const studentData = req.body;
    const prediction = academicMlService.predictStudent(studentData);
    res.json(prediction);
  } catch (err) {
    console.error('Error calculating ML student prediction:', err);
    res.status(500).json({ error: 'Failed to generate ML prediction: ' + err.message });
  }
};

/**
 * Machine Learning: Simulate What-If Academic Adjustments (e.g. increase study hours / attendance)
 */
exports.simulateIntervention = async (req, res) => {
  try {
    const { student, adjustments } = req.body;
    if (!student) return res.status(400).json({ error: 'Missing student data payload.' });
    const simulation = academicMlService.simulateWhatIf(student, adjustments || {});
    res.json(simulation);
  } catch (err) {
    console.error('Error simulating ML intervention:', err);
    res.status(500).json({ error: 'Failed to simulate intervention: ' + err.message });
  }
};

/**
 * Machine Learning: Cohort-wide ML Academic Projection
 */
exports.getMlCohortPredictions = async (req, res) => {
  try {
    const schoolId = resolveSchoolId(req);
    if (!schoolId) {
      return res.json({ prediction_available: false, official_result: false, students: [], message: 'This account is not linked to a school.' });
    }
    const params = [schoolId];
    let classClause = '';
    if (String(req.user.role || '').toLowerCase() === 'teacher') {
      const classIds = await teacherClassIds(db, req.user.id, schoolId);
      if (!classIds.length) {
        return res.json({ prediction_available: false, official_result: false, students: [], message: 'No assigned classes were found for this teacher.' });
      }
      params.push(classIds);
      classClause = ` AND c.class_id = ANY($${params.length}::int[])`;
    }
    const learnersRes = await db.query(`
      SELECT c.id, c.full_name, c.surname, c.grade, c.stream, c.school_id, c.class_id,
             ROUND(mk.avg_score::numeric, 1) as previous_score
      FROM children c
      LEFT JOIN (
        SELECT child_id, AVG(score) as avg_score
        FROM marks
        WHERE score IS NOT NULL
        GROUP BY child_id
      ) mk ON c.id = mk.child_id
      WHERE c.grade = 12 AND c.school_id = $1 ${classClause}
    `, params);
    const students = learnersRes.rows.map((row) => ({
      id: row.id,
      name: `${row.full_name || ''} ${row.surname || ''}`.trim(),
      grade: row.grade,
      stream: row.stream || null,
      recorded_average: Number.isFinite(parseFloat(row.previous_score)) ? parseFloat(row.previous_score) : null,
      prediction_available: false,
      official_result: false
    }));
    res.json({
      prediction_available: false,
      official_result: false,
      students,
      message: 'Cohort predictions are not produced from sample marks, sample study hours, or unnamed stand-in learners.'
    });
  } catch (err) {
    console.error('Error generating ML cohort predictions:', err);
    res.status(500).json({ error: 'Failed to generate ML cohort predictions: ' + err.message });
  }
};
