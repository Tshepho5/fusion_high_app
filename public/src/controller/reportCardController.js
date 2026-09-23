const db = require('../../../db/db');
const emailService = require('../services/emailService');
const aiAdvisorService = require('../services/aiAdvisorService');

/**
 * Maps percentage mark to South African CAPS official 7-Point Achievement Rating Level
 * Level 7: Outstanding (80 - 100%)
 * Level 6: Meritorious (70 - 79%)
 * Level 5: Substantial (60 - 69%)
 * Level 4: Adequate (50 - 59%)
 * Level 3: Moderate (40 - 49%)
 * Level 2: Elementary (30 - 39%)
 * Level 1: Not Achieved (0 - 29%)
 */
const getCapsLevel = (percentage) => {
  const p = Math.round(Number(percentage) || 0);
  if (p >= 80) return { level: 7, rating: 'Outstanding Achievement', descriptor: '7: Outstanding (80 - 100%)', badge: 'gold' };
  if (p >= 70) return { level: 6, rating: 'Meritorious Achievement', descriptor: '6: Meritorious (70 - 79%)', badge: 'cyan' };
  if (p >= 60) return { level: 5, rating: 'Substantial Achievement', descriptor: '5: Substantial (60 - 69%)', badge: 'blue' };
  if (p >= 50) return { level: 4, rating: 'Adequate Achievement', descriptor: '4: Adequate (50 - 59%)', badge: 'green' };
  if (p >= 40) return { level: 3, rating: 'Moderate Achievement', descriptor: '3: Moderate (40 - 49%)', badge: 'amber' };
  if (p >= 30) return { level: 2, rating: 'Elementary Achievement', descriptor: '2: Elementary (30 - 39%)', badge: 'orange' };
  return { level: 1, rating: 'Not Achieved', descriptor: '1: Not Achieved (0 - 29%)', badge: 'red' };
};

/**
 * Evaluates South African Department of Basic Education (DBE) National Promotion Requirements
 */
const calculateSouthAfricanPromotion = (subjects, overallAverage) => {
  if (!subjects || subjects.length === 0) {
    return overallAverage >= 50 ? 'PROMOTED TO NEXT GRADE' : 'PENDING REMEDIATION';
  }

  // Count subjects meeting CAPS thresholds
  let passedCount = 0;
  let hasHomeLanguagePass = false;
  let passedAbove50Count = 0;

  for (const s of subjects) {
    const mark = Number(s.mark) || 0;
    const name = (s.subject || '').toLowerCase();

    if (name.includes('home language') || name.includes('english hl') || name.includes('sepedi') || name.includes('isizulu')) {
      if (mark >= 40) hasHomeLanguagePass = true;
    }

    if (mark >= 40) passedCount++;
    if (mark >= 50) passedAbove50Count++;
  }

  // Senior / FET Phase CAPS criteria
  if (overallAverage >= 65 && passedAbove50Count >= 4) {
    return 'PROMOTED';
  } else if (overallAverage >= 50 && passedAbove50Count >= 3) {
    return 'PROMOTED';
  } else if (overallAverage >= 40 && passedCount >= 4) {
    return 'PROMOTED';
  } else if (overallAverage >= 50) {
    return 'PROMOTED';
  } else if (overallAverage >= 40) { 
    return 'PROGRESSION';
  } else {
    return 'NOT PROMOTED';
  }
};

/**
 * Compiles and fetches the Report Card Template Data for a specific Grade, Class, and Stream.
 * Aggregates all teacher-uploaded assessment marks and calculates the percentage each assessment holds.
 */
exports.getGradeTemplateMarks = async (req, res) => {
  try {
    const grade = parseInt(req.query.grade || '10', 10);
    let stream = (req.query.stream || 'Science').trim();
    if (stream.toLowerCase().includes('science')) stream = 'Science';
    else if (stream.toLowerCase().includes('commerce')) stream = 'Commerce';
    else if (stream.toLowerCase().includes('tourism')) stream = 'Tourism';
    else if (stream.toLowerCase().includes('general')) stream = 'General';

    const className = (req.query.class_name || req.query.class || req.query.className || '').trim();
    const termNum = parseInt(String(req.query.term || '3').replace(/[^0-9]/g, ''), 10) || 3;
    const academicYear = parseInt(req.query.academic_year || req.query.academicYear || '2026', 10);
    const rawSchoolId = req.query.school_id || req.headers['x-school-id'] || req.user?.school_id || 1;
    const schoolId = parseInt(rawSchoolId, 10) || 1;

    // 1. Fetch School Information safely
    let schoolInfo = {
      name: 'Fusion High School',
      emis_number: '911220001',
      circuit: 'Polokwane Central Circuit',
      district: 'Capricorn South District',
      province: 'Limpopo',
      physical_address: 'Polokwane Central, Limpopo, 0700',
      postal_address: 'P.O. Box 1024, Polokwane, 0700',
      contact_email: 'admin@fusionhigh.co.za',
      contact_phone: '+27 15 291 0000',
      principal_name: 'Dr. T. Makola'
    };
    try {
      const schoolRes = await db.query(
        `SELECT id, name, emis_number, circuit, district, province, physical_address,
                contact_email, contact_phone, principal_name, logo_url, badge_url, motto
         FROM schools WHERE id = $1 LIMIT 1`,
        [schoolId]
      );
      if (schoolRes.rows[0]) {
        schoolInfo = { ...schoolInfo, ...schoolRes.rows[0] };
      }
    } catch (_) {}

    // 2. Query all distinct curriculum subjects for this grade and stream directly from the database
    let subQuery = `
      SELECT DISTINCT name, code 
      FROM subjects
      WHERE grade = $1
    `;
    const subParams = [grade];
    if (grade >= 10 && stream && stream !== 'All') {
      subParams.push(stream);
      subQuery += ` AND (stream = $${subParams.length} OR stream = 'General' OR stream IS NULL)`;
    }
    subQuery += ` ORDER BY name ASC;`;

    const subRes = await db.query(subQuery, subParams);
    let schoolSubjects = subRes.rows.map(s => s.name);

    if (schoolSubjects.length === 0) {
      const fallbackSub = await db.query(
        `SELECT DISTINCT name FROM subjects WHERE grade = $1 ORDER BY name ASC;`,
        [grade]
      );
      schoolSubjects = fallbackSub.rows.map(s => s.name);
    }

    if (schoolSubjects.length === 0) {
      if (stream === 'Science') {
        schoolSubjects = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation', 'Geography'];
      } else if (stream === 'Commerce') {
        schoolSubjects = ['Accounting', 'Business Studies', 'Economics', 'Mathematics', 'English FAL', 'Life Orientation', 'Home Language'];
      } else if (stream === 'Tourism') {
        schoolSubjects = ['Tourism', 'History', 'Geography', 'Mathematical Literacy', 'English FAL', 'Life Orientation', 'Home Language']; 
      } else {
        schoolSubjects = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Life Orientation'];
      }
    }

    // 3. Fetch all enrolled learners for this Grade, Class, and Stream
    const params = [schoolId, grade];
    let classClause = '';
    if (className && className !== 'All') {
      params.push(className);
      classClause = `AND (cl.name = $${params.length} OR c.class_id::text = $${params.length})`;
    }

    let streamClause = '';
    if (stream && stream !== 'All') {
      params.push(stream);
      streamClause = `AND (c.stream = $${params.length} OR c.stream IS NULL)`;
    }

    const learnersQuery = `
      SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects,
             COALESCE(cl.name, CONCAT(c.grade, 'A')) as class_name,
             p.email as parent_email, CONCAT(p.full_name, ' ', p.surname) as parent_name, p.phone as parent_phone
      FROM children c
      LEFT JOIN classes cl ON c.class_id = cl.id
      LEFT JOIN parent_children pc ON c.id = pc.child_id
      LEFT JOIN users p ON pc.parent_id = p.id OR c.parent_id = p.id
      WHERE (c.school_id = $1 OR $1 IS NULL) AND c.grade = $2
      ${classClause}
      ${streamClause}
      ORDER BY c.surname ASC, c.full_name ASC;
    `;

    let { rows: learners } = await db.query(learnersQuery, params);

    // Fallback: If no learners found for this specific school, load enrolled learners for this grade across the database
    if (learners.length === 0) {
      const fallbackParams = [grade];
      let fallbackStream = '';
      if (stream && stream !== 'All') {
        fallbackParams.push(stream);
        fallbackStream = `AND (c.stream = $${fallbackParams.length} OR c.stream IS NULL)`;
      }
      const fallbackQuery = `
        SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects,
               COALESCE(cl.name, CONCAT(c.grade, 'A')) as class_name,
               p.email as parent_email, CONCAT(p.full_name, ' ', p.surname) as parent_name, p.phone as parent_phone
        FROM children c
        LEFT JOIN classes cl ON c.class_id = cl.id
        LEFT JOIN parent_children pc ON c.id = pc.child_id
        LEFT JOIN users p ON pc.parent_id = p.id OR c.parent_id = p.id
        WHERE c.grade = $1
        ${fallbackStream}
        ORDER BY c.surname ASC, c.full_name ASC;
      `;
      const fallbackRes = await db.query(fallbackQuery, fallbackParams);
      learners = fallbackRes.rows;
    }

    // 4. Fetch already saved report_cards records if admin compiled before
    let existingCardsMap = new Map();
    try {
      const existingCardsRes = await db.query(
        `SELECT * FROM report_cards
         WHERE grade = $1 AND term = $2 AND academic_year = $3`,
        [grade, termNum, academicYear]
      );
      existingCardsRes.rows.forEach(rc => {
        existingCardsMap.set(rc.child_id, rc);
      });
    } catch (_) {}

    // 5. For each learner, fetch real marks and attendance
    const compiledLearners = [];

    for (const l of learners) {
      const existingCard = existingCardsMap.get(l.id);

      // Determine subjects for this learner
      let studentSubjects = Array.isArray(l.subjects) && l.subjects.length > 0
        ? [...l.subjects]
        : [...schoolSubjects];

      // Guarantee Geography is always included for Science stream FET learners
      if (grade >= 10 && (l.stream === 'Science' || stream === 'Science')) {
        if (!studentSubjects.some(s => s.toLowerCase() === 'geography')) {
          studentSubjects.push('Geography');
        }
      }

      // Fetch attendance register records for this student
      const attRes = await db.query(
        `SELECT
           COUNT(*) as total_days,
           COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as days_present,
           COUNT(CASE WHEN status = 'absent' THEN 1 END) as days_absent
         FROM attendance
         WHERE child_id = $1`,
        [l.id]
      );
      const totalDays = parseInt(attRes.rows[0]?.total_days || '0', 10);
      const daysPresent = parseInt(attRes.rows[0]?.days_present || '0', 10);
      const daysAbsent = parseInt(attRes.rows[0]?.days_absent || (totalDays > 0 ? totalDays - daysPresent : '0'), 10);
      const attRate = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : null;

      // Fetch ONLY recorded formal assessment marks (Strictly exclude informal quizzes / drills)
      const marksRes = await db.query(
        `SELECT subject, assessment_name, score, max_score, percentage, weight, is_formal, assessment_type, recorded_at
         FROM marks
         WHERE (child_id = $1 OR learner_id = $1)
           AND (term = $2 OR term IS NULL)
           AND (is_formal = TRUE OR is_formal IS NULL)
         ORDER BY recorded_at ASC`,
        [l.id, termNum]
      );

      // Calculate marks & assessment percentage weighting for each subject
      const subjectOutcomes = [];

      for (const subj of studentSubjects) {
        const matchingMarks = marksRes.rows.filter(m => (m.subject || '').toLowerCase() === subj.toLowerCase());

        let assessments = [];
        let finalSubjectPct = null;
        let sbaMark = null;
        let examMark = null;
        let rawScoreSum = 0;
        let maxScoreSum = 0;

        if (matchingMarks.length > 0) {
          // Dynamic calculation: weight contributions are strictly based on what formal assessments exist
          let totalWeight = 0;
          let weightedSum = 0;
          let sbaWeightSum = 0;
          let sbaTotalWeight = 0;
          let examWeightSum = 0;
          let examTotalWeight = 0;

          assessments = matchingMarks.map(m => {
            const rawScore = Number(m.score) || 0;
            const maxScore = Number(m.max_score) || 100;
            const pct = m.percentage ? Number(m.percentage) : Math.round((rawScore / (maxScore || 100)) * 100);
            const w = Number(m.weight) || maxScore || 100;
            const aType = (m.assessment_type || m.assessment_name || '').toLowerCase();
            const isExam = aType.includes('exam') || aType.includes('examination');

            totalWeight += w;
            weightedSum += pct * w;
            rawScoreSum += rawScore;
            maxScoreSum += maxScore;

            if (isExam) {
              examWeightSum += pct * w;
              examTotalWeight += w;
            } else {
              sbaWeightSum += pct * w;
              sbaTotalWeight += w;
            }

            return {
              name: m.assessment_name || 'Class Assessment',
              type: m.assessment_type || (isExam ? 'Examination' : 'Formal Assessment'),
              score: rawScore,
              max_score: maxScore,
              weight: w,
              percentage: pct
            };
          });

          sbaMark = sbaTotalWeight > 0 ? Math.round(sbaWeightSum / sbaTotalWeight) : null;
          examMark = examTotalWeight > 0 ? Math.round(examWeightSum / examTotalWeight) : null;

          if (sbaMark !== null && examMark !== null) {
            finalSubjectPct = Math.round((sbaMark * 0.4) + (examMark * 0.6));
          } else if (sbaMark !== null) {
            finalSubjectPct = sbaMark;
          } else if (examMark !== null) {
            finalSubjectPct = examMark;
          } else {
            finalSubjectPct = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : Math.round(assessments[0].percentage);
          }
        } else if (existingCard && Array.isArray(existingCard.marks_breakdown)) {
          // Fallback to previously saved card breakdown if admin already verified & saved
          const prev = existingCard.marks_breakdown.find(b => (b.subject || '').toLowerCase() === subj.toLowerCase());
          if (prev && prev.mark !== null && prev.mark !== undefined && !prev.is_pending) {
            finalSubjectPct = Number(prev.mark);
            rawScoreSum = prev.raw_score || finalSubjectPct;
            maxScoreSum = prev.max_score || 100;
            sbaMark = prev.sba_mark ?? finalSubjectPct;
            examMark = prev.exam_mark ?? null;
            assessments = prev.assessments || [{ name: 'Transferred Formal Mark', score: finalSubjectPct, max_score: 100, weight: 100, percentage: finalSubjectPct }];
          } else {
            finalSubjectPct = null;
            assessments = [];
          }
        } else {
          // Strictly remains clean/empty with NO fake placeholder or quiz marks!
          finalSubjectPct = null;
          assessments = [];
        }

        const markDisplay = maxScoreSum > 0 ? `${rawScoreSum} / ${maxScoreSum}` : (finalSubjectPct !== null ? `${finalSubjectPct}%` : '-');

        if (finalSubjectPct !== null && !isNaN(finalSubjectPct)) {
          finalSubjectPct = Math.min(100, Math.max(0, finalSubjectPct));
          const caps = getCapsLevel(finalSubjectPct);

          const totalAssessmentsWeight = assessments.reduce((acc, a) => acc + (a.weight || 100), 0) || 100;
          assessments = assessments.map(a => ({
            ...a,
            holding_pct: Math.round(((a.weight || 100) / totalAssessmentsWeight) * 100)
          }));

          subjectOutcomes.push({
            subject: subj,
            code: subj.substring(0, 4).toUpperCase(),
            mark_display: markDisplay,
            raw_score: rawScoreSum,
            max_score: maxScoreSum,
            mark: finalSubjectPct,
            percentage: finalSubjectPct,
            sba_mark: sbaMark,
            exam_mark: examMark,
            level: caps.level,
            rating: caps.rating,
            descriptor: caps.descriptor,
            badge: caps.badge,
            is_pending: false,
            assessments_count: assessments.length,
            assessments: assessments
          });
        } else {
          // Clean empty subject slot on standby
          subjectOutcomes.push({
            subject: subj,
            code: subj.substring(0, 4).toUpperCase(),
            mark_display: '-',
            raw_score: null,
            max_score: null,
            mark: null,
            percentage: null,
            sba_mark: null,
            exam_mark: null,
            level: '-',
            rating: 'Pending Upload',
            descriptor: 'Teacher Marks Not Uploaded',
            badge: 'amber',
            is_pending: true,
            assessments_count: 0,
            assessments: []
          });
        }
      }

      // Compute total, average, and promotion status only from subjects with uploaded formal marks
      const gradedSubjects = subjectOutcomes.filter(s => s.mark !== null && !s.is_pending);
      const hasMarks = gradedSubjects.length > 0;
      const totalMarksSum = gradedSubjects.reduce((sum, s) => sum + s.mark, 0);
      const overallAvg = hasMarks ? Math.round(totalMarksSum / gradedSubjects.length) : null;
      const overallCaps = hasMarks ? getCapsLevel(overallAvg) : { level: '-', rating: 'Pending', descriptor: 'Pending Teacher Upload', badge: 'amber' };
      const promotionDecision = hasMarks ? calculateSouthAfricanPromotion(gradedSubjects, overallAvg) : 'PENDING TEACHER MARKS';

      const defaultTeacherComment = hasMarks
        ? (overallAvg >= 75
          ? 'Exemplary academic focus, diligent task completion, and analytical thinking shown throughout the term.'
          : (overallAvg >= 50 ? 'Consistent effort and positive progress demonstrated. Dedicated revision in complex topics recommended.' : 'Requires structured academic intervention and daily revision of foundational principles.'))
        : 'Awaiting teacher submission of official term marks.';

      const defaultPrincipalComment = hasMarks
        ? (overallAvg >= 60
          ? 'Promoted with congratulations. Commendable discipline and dedication to academic excellence.'
          : (overallAvg >= 50 ? 'Satisfactory achievement. Encouraged to aim for distinction in the upcoming term.' : 'Parent consultation recommended to coordinate targeted academic remediation.'))
        : 'Official term marks pending educator submission.';

      const rawFirst = (l.full_name || '').trim();
      const rawSur = (l.surname || '').trim();
      const cleanLearnerName = rawFirst.toLowerCase().endsWith(rawSur.toLowerCase())
        ? rawFirst
        : `${rawFirst} ${rawSur}`.trim();

      compiledLearners.push({
        child_id: l.id,
        learner_name: rawFirst,
        learner_surname: rawSur,
        full_name: cleanLearnerName,
        learner_number: l.learner_number || `2026-FHS-${String(l.id).padStart(3, '0')}`,
        grade: l.grade,
        class_name: l.class_name,
        stream: l.stream || stream,
        parent_name: l.parent_name || 'Guardian',
        parent_email: l.parent_email || null,
        parent_phone: l.parent_phone || null,
        attendance: {
          days_present: daysPresent,
          days_absent: daysAbsent,
          total_days: totalDays,
          percentage: attRate
        },
        attendance_percentage: attRate,
        subjects: subjectOutcomes,
        subjects_breakdown: subjectOutcomes,
        total_marks: totalMarksSum,
        overall_average: existingCard ? Number(existingCard.overall_average) : overallAvg,
        overall_level: existingCard ? existingCard.overall_level : overallCaps.level,
        overall_rating: existingCard ? getCapsLevel(existingCard.overall_average).rating : overallCaps.rating,
        promotion_status: existingCard?.promotion_status || promotionDecision,
        teacher_comment: existingCard?.teacher_comment || defaultTeacherComment,
        principal_comment: existingCard?.principal_comment || defaultPrincipalComment,
        principal_signature: existingCard?.principal_signature || 'Dr. T. Makola (Signed)',
        ai_advisory: existingCard?.ai_advisory || null,
        is_published: existingCard ? !!existingCard.is_published : false
      });
    }

    // Calculate real dynamic class averages and pass rates per subject
    const subjectStatsMap = {};
    schoolSubjects.forEach(sName => {
      const marksForSubj = [];
      compiledLearners.forEach(learner => {
        const subOutcome = (learner.subjects || []).find(s => (s.subject || '').toLowerCase() === sName.toLowerCase());
        if (subOutcome && subOutcome.mark !== null && !subOutcome.is_pending) {
          marksForSubj.push(Number(subOutcome.mark));
        }
      });
      const count = marksForSubj.length;
      const avg = count > 0 ? Math.round(marksForSubj.reduce((a, b) => a + b, 0) / count) : null;
      const passCount = marksForSubj.filter(m => m >= 50).length;
      const passRate = count > 0 ? Math.round((passCount / count) * 100) : null;
      subjectStatsMap[sName.toLowerCase()] = { average: avg, pass_rate: passRate, recorded_count: count };
    });

    compiledLearners.forEach(learner => {
      (learner.subjects || []).forEach(s => {
        const stats = subjectStatsMap[(s.subject || '').toLowerCase()];
        s.average = stats?.average ?? null;
      });
    });

    res.json({
      success: true,
      school: schoolInfo,
      grade,
      stream,
      class_name: className || 'All',
      term: termNum,
      academic_year: academicYear,
      subjects: schoolSubjects,
      schoolSubjects: schoolSubjects,
      total_learners: compiledLearners.length,
      learners: compiledLearners
    });

  } catch (err) {
    console.error('Error fetching grade template marks:', err);
    res.status(500).json({ success: false, error: 'Failed to prepare grade template marks: ' + err.message });
  }
};

/**
 * Saves and Compiles the reviewed/edited Grade Report Cards into the database.
 */
exports.saveGradeReportCardTemplate = async (req, res) => {
  try {
    const { grade, term = 3, academic_year = 2026, school_id, learners_reports } = req.body;
    const targetSchoolId = school_id || req.user?.school_id || 1;
    const tNum = parseInt(term, 10);
    const yr = parseInt(academic_year, 10);

    if (!Array.isArray(learners_reports) || learners_reports.length === 0) {
      return res.status(400).json({ success: false, error: 'No learner report records provided.' });
    }

    let savedCount = 0;

    for (const item of learners_reports) {
      const childId = parseInt(item.child_id, 10);
      if (!childId) continue;

      const subjects = (item.subjects || []).map(s => {
        const mark = Math.min(100, Math.max(0, Math.round(Number(s.mark) || 0)));
        const caps = getCapsLevel(mark);
        return {
          subject: s.subject,
          mark: mark,
          level: caps.level,
          rating: caps.rating,
          descriptor: caps.descriptor,
          assessments: s.assessments || []
        };
      });

      const totalMarks = subjects.reduce((sum, s) => sum + s.mark, 0);
      const avg = subjects.length > 0 ? Math.round(totalMarks / subjects.length) : 0;
      const caps = getCapsLevel(avg);
      const promotionDecision = item.promotion_status || calculateSouthAfricanPromotion(subjects, avg);

      const daysPresent = parseInt(item.attendance?.days_present ?? item.days_present ?? 0, 10);
      const daysAbsent = parseInt(item.attendance?.days_absent ?? item.days_absent ?? 0, 10);
      const totalDays = parseInt(item.attendance?.total_days ?? item.total_days ?? (daysPresent + daysAbsent), 10);
      const attRate = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : null;

      // Compute or preserve AI Advisory (Option A)
      let aiAdvisory = item.ai_advisory || null;
      if (!aiAdvisory && subjects.length > 0) {
        const scoresMap = {};
        subjects.forEach(s => { scoresMap[(s.subject || '').toLowerCase()] = s.mark; });
        const aiPayload = {
          math_score: scoresMap['mathematics'] || scoresMap['maths'] || scoresMap['math'] || avg || 75,
          physics_score: scoresMap['physical sciences'] || scoresMap['physics'] || avg || 70,
          chemistry_score: scoresMap['chemistry'] || scoresMap['physical sciences'] || avg || 70,
          biology_score: scoresMap['life sciences'] || scoresMap['biology'] || avg || 72,
          english_score: scoresMap['english fal'] || scoresMap['english'] || scoresMap['home language'] || avg || 75,
          history_score: scoresMap['history'] || scoresMap['social sciences'] || avg || 70,
          geography_score: scoresMap['geography'] || avg || 70,
          absence_days: daysAbsent,
          weekly_self_study_hours: 18,
          extracurricular_activities: 1
        };
        try {
          aiAdvisory = await aiAdvisorService.predictStudent(aiPayload);
        } catch (_) {}
      }

      // Check if existing
      const existRes = await db.query(
        `SELECT id, is_published FROM report_cards
         WHERE school_id = $1 AND child_id = $2 AND term = $3 AND academic_year = $4
         LIMIT 1`,
        [targetSchoolId, childId, tNum, yr]
      );

      if (existRes.rows.length > 0) {
        await db.query(
          `UPDATE report_cards
           SET marks_breakdown = $1,
               overall_average = $2,
               overall_level = $3,
               promotion_status = $4,
               class_name = $5,
               stream = $6,
               days_present = $7,
               days_absent = $8,
               total_days = $9,
               attendance_percentage = $10,
               teacher_comment = $11,
               principal_comment = $12,
               principal_signature = $13,
               ai_advisory = $14,
               updated_at = NOW()
           WHERE id = $15`,
          [
            JSON.stringify(subjects),
            avg,
            caps.level,
            promotionDecision,
            item.class_name || null,
            item.stream || null,
            daysPresent,
            daysAbsent,
            totalDays,
            attRate,
            item.teacher_comment || 'Satisfactory academic progress demonstrated.',
            item.principal_comment || 'Promoted with commendation.',
            item.principal_signature || 'Dr. T. Makola (Signed)',
            aiAdvisory ? JSON.stringify(aiAdvisory) : null,
            existRes.rows[0].id
          ]
        );
      } else {
        await db.query(
          `INSERT INTO report_cards (
             school_id, child_id, grade, class_name, stream, term, academic_year,
             marks_breakdown, overall_average, overall_level, promotion_status,
             days_present, days_absent, total_days, attendance_percentage,
             teacher_comment, principal_comment, principal_signature,
             ai_advisory, is_published, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, FALSE, NOW(), NOW())`,
          [
            targetSchoolId,
            childId,
            grade || item.grade || 10,
            item.class_name || null,
            item.stream || null,
            tNum,
            yr,
            JSON.stringify(subjects),
            avg,
            caps.level,
            promotionDecision,
            daysPresent,
            daysAbsent,
            totalDays,
            attRate,
            item.teacher_comment || 'Satisfactory academic progress demonstrated.',
            item.principal_comment || 'Promoted with commendation.',
            item.principal_signature || 'Dr. T. Makola (Signed)',
            aiAdvisory ? JSON.stringify(aiAdvisory) : null
          ]
        );
      }
      savedCount++;
    }

    res.json({
      success: true,
      message: `Successfully verified and compiled ${savedCount} official CAPS report cards in database. Ready for publication.`,
      compiled_count: savedCount
    });

  } catch (err) {
    console.error('Error saving grade report card template:', err);
    res.status(500).json({ success: false, error: 'Failed to save grade report card template: ' + err.message });
  }
};

/**
 * Publishes compiled Grade Report Cards to Parents and Teachers.
 * Automatically dispatches official emails with login links directly navigating to their child's report.
 */
exports.publishGradeReportCards = async (req, res) => {
  try {
    const { grade = 10, term = 3, academic_year = 2026, school_id } = req.body;
    const targetSchoolId = school_id || req.user?.school_id || 1;
    const tNum = parseInt(term, 10);
    const yr = parseInt(academic_year, 10);

    // 1. Mark report_cards as published
    const updateRes = await db.query(
      `UPDATE report_cards
       SET is_published = TRUE, published_at = NOW(), updated_at = NOW()
       WHERE school_id = $1 AND grade = $2 AND term = $3 AND academic_year = $4
       RETURNING child_id`,
      [targetSchoolId, grade, tNum, yr]
    );

    // 2. Fetch all learners in this grade with their compiled report card and linked parent(s)
    const query = `
      SELECT
        c.id AS child_id,
        c.full_name AS child_name,
        c.surname AS child_surname,
        c.learner_number,
        c.grade,
        rc.overall_average,
        rc.overall_level,
        rc.promotion_status,
        p.email AS parent_email,
        p.full_name AS parent_name,
        p.surname AS parent_surname,
        s.name AS school_name,
        s.circuit,
        s.district,
        s.province,
        s.principal_name
      FROM children c
      JOIN report_cards rc ON rc.child_id = c.id AND rc.term = $2 AND rc.academic_year = $3
      LEFT JOIN parent_children pc ON c.id = pc.child_id
      LEFT JOIN users p ON pc.parent_id = p.id OR c.parent_id = p.id
      JOIN schools s ON c.school_id = s.id
      WHERE c.grade = $1 AND c.school_id = $4;
    `;

    const { rows: learners } = await db.query(query, [grade, tNum, yr, targetSchoolId]);

    let emailSentCount = 0;
    const appUrl = (process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');

    for (const l of learners) {
      if (l.parent_email) {
        try {
          const directLoginUrl = `${appUrl}/login?redirect=${encodeURIComponent(`/dashboard/parent.html?tab=reports&child_id=${l.child_id}`)}`;
          const overallAvg = Number(l.overall_average) || 0;
          const caps = getCapsLevel(overallAvg);

          const emailSubject = `Official DBE CAPS Term ${tNum} Academic Report Card — ${l.child_name} ${l.child_surname} (Grade ${l.grade})`;

          const emailContent = `
            <p>Dear ${l.parent_name || 'Parent/Guardian'},</p>
            <p>The official Department of Basic Education (CAPS) Term ${tNum} Academic Report Card for <strong>${l.child_name} ${l.child_surname}</strong> (Learner #: ${l.learner_number}) has been compiled and officially endorsed by the Principal.</p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%; margin:20px 0; background:#0f172a; border-radius:12px; padding:18px; color:#ffffff;">
              <tr>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:14px; color:#94a3b8;">Learner Name:</td>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:15px; font-weight:bold; color:#ffffff; text-align:right;">${l.child_name} ${l.child_surname}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:14px; color:#94a3b8;">Grade & Academic Term:</td>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:14px; color:#38bdf8; font-weight:bold; text-align:right;">Grade ${l.grade} • Term ${tNum} (${yr})</td>
              </tr>
              <tr>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:14px; color:#94a3b8;">Overall Term Average:</td>
                <td style="padding:8px 0; border-bottom:1px solid #334155; font-size:18px; font-weight:800; color:#34d399; text-align:right;">${overallAvg}% (${caps.descriptor})</td>
              </tr>
              <tr>
                <td style="padding:8px 0; font-size:14px; color:#94a3b8;">Promotion Decision:</td>
                <td style="padding:8px 0; font-size:13px; font-weight:bold; color:#a5b4fc; text-align:right;">${l.promotion_status || 'PROMOTED TO NEXT GRADE'}</td>
              </tr>
            </table>

            <p style="font-size:14px; line-height:1.6; color:#cbd5e1;">
              You can now view, download, and print your child's authenticated report card certificate containing the complete subject-by-subject assessment breakdown and the official Principal signature.
            </p>
          `;

          if (emailService && emailService.send) {
            await emailService.send(
              l.parent_email,
              emailSubject,
              emailContent,
              {
                preheader: `Official Term ${tNum} Report Card for ${l.child_name} ${l.child_surname} is now available.`,
                title: `Term ${tNum} Academic Report Card Ready`,
                subtitle: `${l.school_name} • ${l.circuit}`,
                ctaText: 'Login to View & Download Report Card',
                ctaLink: directLoginUrl
              }
            );
            emailSentCount++;

            // Record timestamp in report_cards
            await db.query(
              `UPDATE report_cards SET emailed_at = NOW() WHERE child_id = $1 AND term = $2`,
              [l.child_id, tNum]
            );
          }
        } catch (mailErr) {
          console.warn(`[EMAIL SEND ERROR] Child ${l.child_id}:`, mailErr.message);
        }
      }
    }

    // 3. Create school announcement for parents and teachers
    try {
      await db.query(
        `INSERT INTO announcements (title, content, role_target, grade_target, school_id, author_id, created_at)
         VALUES ($1, $2, 'all', $3, $4, $5, NOW())`,
        [
          `Official Term ${tNum} Grade ${grade} Report Cards Published`,
          `Official CAPS Term ${tNum} report cards for Grade ${grade} have been compiled, verified, and published. Parents and educators can now inspect subject marks and download the signed certificate from their portal.`,
          grade,
          targetSchoolId,
          req.user?.id || 1
        ]
      );
    } catch (annErr) {
      console.warn('[ANNOUNCEMENT ERROR]', annErr.message);
    }

    res.json({
      success: true,
      message: `Grade ${grade} Term ${tNum} Report Cards published successfully! Notifications sent and ${emailSentCount} emails delivered to parents with direct login access.`,
      published_count: updateRes.rows.length,
      emails_sent: emailSentCount
    });

  } catch (err) {
    console.error('Error publishing grade report cards:', err);
    res.status(500).json({ success: false, error: 'Failed to publish grade report cards: ' + err.message });
  }
};

/**
 * Returns full South African CAPS Report Card Data for a single learner (for printable view / PDF).
 */
exports.getOfficialReportCardView = async (req, res) => {
  try {
    const childId = parseInt(req.query.childId || req.query.child_id || req.params?.childId, 10);
    const termNum = parseInt(String(req.query.term || '3').replace(/[^0-9]/g, ''), 10) || 3;
    const academicYear = parseInt(req.query.academic_year || req.query.academicYear || '2026', 10);

    if (!childId) {
      return res.status(400).json({ error: 'Child ID is required.' });
    }

    // 1. Fetch learner and school data
    const childRes = await db.query(
      `SELECT c.*, s.name as school_name, s.emis_number, s.circuit, s.district, s.province,
              s.physical_address, s.postal_address, s.contact_email, s.contact_phone, s.principal_name,
              s.logo_url, s.badge_url,
              cl.name as class_name,
              p.full_name as parent_full_name, p.surname as parent_surname, p.phone as parent_phone
       FROM children c
       LEFT JOIN schools s ON c.school_id = s.id
       LEFT JOIN classes cl ON c.class_id = cl.id
       LEFT JOIN parent_children pc ON c.id = pc.child_id
       LEFT JOIN users p ON pc.parent_id = p.id OR c.parent_id = p.id
       WHERE c.id = $1 LIMIT 1`,
      [childId]
    );

    if (childRes.rows.length === 0) {
      return res.status(404).json({ error: 'Learner record not found.' });
    }
    const child = childRes.rows[0];

    // 2. Fetch report card record from report_cards
    const cardRes = await db.query(
      `SELECT * FROM report_cards
       WHERE child_id = $1 AND term = $2
       ORDER BY academic_year DESC, id DESC LIMIT 1`,
      [childId, termNum]
    );

    const userRole = (req.user?.role || '').toLowerCase();
    let reportCard = cardRes.rows[0];

    // If requester is a parent or learner and the card is not published:
    if ((userRole === 'parent' || userRole === 'learner') && (!reportCard || !reportCard.is_published)) {
      return res.json({
        success: true,
        is_published: false,
        not_published: true,
        message: 'Report Card for this term has not yet been published by the school administration.',
        learner: {
          full_name: `${child.full_name} ${child.surname}`.trim(),
          learner_number: child.learner_number || '',
          grade: child.grade,
          stream: child.stream || 'Science',
          class_name: child.class_name || `${child.grade}A`
        }
      });
    }

    let subjects = [];

    if (reportCard && Array.isArray(reportCard.marks_breakdown)) {
      subjects = reportCard.marks_breakdown;
    } else {
      // Fallback compile from marks table
      const marksRes = await db.query(
        `SELECT subject, score, max_score, percentage
         FROM marks WHERE child_id = $1 AND (term = $2 OR term IS NULL)`,
        [childId, termNum]
      );
      let studentSubs = Array.isArray(child.subjects) && child.subjects.length > 0
        ? [...child.subjects]
        : (child.stream === 'Commerce'
          ? ['Accounting', 'Business Studies', 'Economics', 'Mathematics', 'English FAL', 'Home Language', 'Life Orientation']
          : ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'English FAL', 'Home Language', 'Life Orientation']);

      if (child.grade >= 10 && child.stream === 'Science' && !studentSubs.some(s => s.toLowerCase() === 'geography')) {
        studentSubs.push('Geography');
      }

      subjects = studentSubs.map(s => {
        const m = marksRes.rows.find(row => (row.subject || '').toLowerCase() === s.toLowerCase());
        const rawScore = m ? Number(m.score) : null;
        const maxScore = m ? (Number(m.max_score) || 100) : null;
        const pct = m ? (m.percentage !== null && m.percentage !== undefined ? Number(m.percentage) : (rawScore !== null ? Math.round((rawScore / maxScore) * 100) : null)) : null;
        const caps = pct !== null ? getCapsLevel(pct) : { level: '-', rating: 'Pending', descriptor: 'Pending Teacher Mark' };
        return {
          subject: s,
          code: s.substring(0, 4).toUpperCase(),
          mark_display: rawScore !== null && maxScore !== null ? `${rawScore} / ${maxScore}` : (pct !== null ? `${pct}%` : '-'),
          raw_score: rawScore,
          max_score: maxScore,
          mark: pct,
          percentage: pct,
          average: null,
          sba_mark: pct,
          exam_mark: null,
          level: caps.level,
          rating: caps.rating,
          descriptor: caps.descriptor,
          comment: pct !== null ? 'Diligent academic performance shown.' : 'Awaiting marks upload.'
        };
      });
    }

    const gradedSubs = subjects.filter(s => s.mark !== null && s.mark !== undefined);
    const totalMarks = gradedSubs.reduce((sum, s) => sum + Number(s.mark), 0);
    const avg = reportCard?.overall_average !== null && reportCard?.overall_average !== undefined
      ? Number(reportCard.overall_average)
      : (gradedSubs.length > 0 ? Math.round(totalMarks / gradedSubs.length) : null);
    const overallCaps = avg !== null ? getCapsLevel(avg) : { level: '-', rating: 'Pending', descriptor: 'Pending Teacher Mark' };
    const promotionStatus = reportCard?.promotion_status || (avg !== null ? calculateSouthAfricanPromotion(subjects, avg) : 'PENDING TEACHER MARKS');

    // Attendance
    const daysPresent = reportCard?.days_present ?? 0;
    const daysAbsent = reportCard?.days_absent ?? 0;
    const totalDays = reportCard?.total_days ?? (daysPresent + daysAbsent);
    const attRate = reportCard?.attendance_percentage ?? (totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : null);

    const schoolData = {
      name: child.school_name || 'Fusion High School',
      emis_number: child.emis_number || '911220001',
      circuit: child.circuit || 'Polokwane Central Circuit',
      district: child.district || 'Capricorn South District',
      province: child.province || 'Limpopo',
      physical_address: child.physical_address || 'Polokwane Central, Limpopo, 0700',
      postal_address: child.postal_address || 'P.O. Box 1024, Polokwane, 0700',
      contact_email: child.contact_email || 'admin@fusionhigh.co.za',
      contact_phone: child.contact_phone || '+27 15 291 0000',
      principal_name: child.principal_name || 'Dr. T. Makola',
      watermark_url: '/assets/fusion-app-icon.png',
      logo_url: child.logo_url || '/assets/fusion-app-icon.png'
    };

    const rawChildName = (child.full_name || '').trim();
    const rawChildSur = (child.surname || '').trim();
    const cleanChildName = rawChildName.toLowerCase().endsWith(rawChildSur.toLowerCase())
      ? rawChildName
      : `${rawChildName} ${rawChildSur}`.trim();

    const learnerData = {
      full_name: cleanChildName,
      first_name: rawChildName,
      surname: rawChildSur,
      learner_number: child.learner_number || `2026-FHS-${String(child.id).padStart(3, '0')}`,
      grade: child.grade,
      class_name: child.class_name || `${child.grade}A`,
      stream: child.stream || 'Science',
      parent_name: `${child.parent_full_name || ''} ${child.parent_surname || ''}`.trim() || 'Parent/Guardian',
      parent_phone: child.parent_phone || 'N/A'
    };

    const formattedSubjects = subjects.map(s => {
      const hasMark = s.mark !== null && s.mark !== undefined && !s.is_pending;
      const numMark = hasMark ? Number(s.mark) : null;
      const caps = numMark !== null ? getCapsLevel(numMark) : { level: '-', rating: 'Pending', descriptor: 'Pending Teacher Mark' };
      return {
        subject: s.subject,
        code: s.code || s.subject.substring(0, 4).toUpperCase(),
        mark_display: s.mark_display || (hasMark ? `${numMark}%` : '-'),
        raw_score: s.raw_score ?? numMark,
        max_score: s.max_score ?? (hasMark ? 100 : null),
        mark: numMark,
        percentage: numMark,
        average: s.average ?? null,
        sba_mark: s.sba_mark ?? numMark,
        exam_mark: s.exam_mark ?? null,
        level: caps.level,
        rating: caps.rating,
        descriptor: caps.descriptor,
        comment: s.comment || (hasMark ? 'Diligent academic performance shown.' : 'Awaiting marks upload.')
      };
    });

    const attendanceData = {
      days_present: daysPresent,
      days_absent: daysAbsent,
      total_days: totalDays,
      attendance_percentage: attRate
    };

    // Fetch or compute AI Advisory (Option A)
    let aiAdvisory = reportCard?.ai_advisory || null;
    if (!aiAdvisory && formattedSubjects.length > 0) {
      const scoresMap = {};
      formattedSubjects.forEach(s => { scoresMap[(s.subject || '').toLowerCase()] = s.mark; });
      const aiPayload = {
        math_score: scoresMap['mathematics'] || scoresMap['maths'] || scoresMap['math'] || avg || 75,
        physics_score: scoresMap['physical sciences'] || scoresMap['physics'] || avg || 70,
        chemistry_score: scoresMap['chemistry'] || scoresMap['physical sciences'] || avg || 70,
        biology_score: scoresMap['life sciences'] || scoresMap['biology'] || avg || 72,
        english_score: scoresMap['english fal'] || scoresMap['english'] || scoresMap['home language'] || avg || 75,
        history_score: scoresMap['history'] || scoresMap['social sciences'] || avg || 70,
        geography_score: scoresMap['geography'] || avg || 70,
        absence_days: daysAbsent,
        weekly_self_study_hours: 18,
        extracurricular_activities: 1
      };
      try {
        aiAdvisory = await aiAdvisorService.predictStudent(aiPayload);
      } catch (_) {}
    }

    res.json({
      success: true,
      school: schoolData,
      learner: learnerData,
      subjects: formattedSubjects,
      attendance: attendanceData,
      overall_average: avg,
      overall_level: overallCaps.level,
      overall_rating: overallCaps.rating,
      promotion_status: promotionStatus,
      term: `Term ${termNum}`,
      academic_year: academicYear,
      ai_advisory: aiAdvisory,
      report_card: {
        school: schoolData,
        learner: learnerData,
        ai_advisory: aiAdvisory,
        academic: {
          term: termNum,
          term_name: `Term ${termNum} ${academicYear}`,
          academic_year: academicYear,
          date_issued: new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
          subjects: formattedSubjects,
          total_marks: totalMarks,
          overall_average: avg,
          overall_level: overallCaps.level,
          overall_rating: overallCaps.rating,
          promotion_status: promotionStatus
        },
        attendance: attendanceData,
        endorsements: {
          teacher_comment: reportCard?.teacher_comment || 'An outstanding term with consistent dedication and positive progress.',
          principal_comment: reportCard?.principal_comment || 'Promoted with commendation. Continue the high academic standard.',
          principal_signature: reportCard?.principal_signature || 'Dr. T. Makola (Signed)',
          principal_name: child.principal_name || 'Dr. T. Makola',
          school_stamp: 'OFFICIAL SCHOOL EMBLEM & REGISTRAR SEAL'
        }
      }
    });

  } catch (err) {
    console.error('Error fetching official report card view:', err);
    res.status(500).json({ error: 'Failed to retrieve report card view: ' + err.message });
  }
};

/**
 * Returns all compiled report cards for a learner or parent.
 */
exports.getLearnerReportCards = async (req, res) => {
  try {
    const { child_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let targetChildId = child_id;

    if (!targetChildId) {
      if (userRole === 'learner') {
        const cRes = await db.query(`SELECT id FROM children WHERE learner_user_id = $1 LIMIT 1`, [userId]);
        targetChildId = cRes.rows[0]?.id;
      } else if (userRole === 'parent') {
        const cRes = await db.query(`
          SELECT c.id FROM children c 
          LEFT JOIN parent_children pc ON c.id = pc.child_id 
          WHERE pc.parent_id = $1 OR c.parent_id = $1 LIMIT 1
        `, [userId]);
        targetChildId = cRes.rows[0]?.id;
      }
    }

    if (!targetChildId) {
      return res.json({ success: true, report_cards: [] });
    }

    const query = `
      SELECT 
        rc.*,
        c.full_name as learner_first_name,
        c.surname as learner_surname,
        c.learner_number,
        c.stream,
        s.name as school_name,
        s.circuit,
        s.district,
        s.province,
        s.emis_number,
        s.physical_address,
        s.postal_address,
        s.principal_name,
        s.logo_url
      FROM report_cards rc
      JOIN children c ON rc.child_id = c.id
      LEFT JOIN schools s ON rc.school_id = s.id
      WHERE rc.child_id = $1
      ORDER BY rc.academic_year DESC, rc.term DESC;
    `;

    const { rows } = await db.query(query, [parseInt(targetChildId, 10)]);
    res.json({ success: true, report_cards: rows });
  } catch (err) {
    console.error('Error fetching learner report cards:', err);
    res.status(500).json({ error: 'Failed to retrieve report cards: ' + err.message });
  }
};

exports.compileReportCard = exports.saveGradeReportCardTemplate;
exports.batchCompileAndEmailReportCards = exports.publishGradeReportCards;

/**
 * Admin Overview: Checks which teachers have submitted marks per Grade, Stream, and Class.
 */
exports.getTeacherSubmissionsOverview = async (req, res) => {
  try {
    const grade = parseInt(req.query.grade || '10', 10);
    const termNum = parseInt(String(req.query.term || '3').replace(/[^0-9]/g, ''), 10) || 3;
    const className = (req.query.class_name || req.query.class || '').trim();
    const stream = (req.query.stream || '').trim();
    const rawSchoolId = req.query.school_id || req.headers['x-school-id'] || req.user?.school_id || 1;
    const schoolId = parseInt(rawSchoolId, 10) || 1;

    // 1. Fetch total enrolled learners for this grade and class
    let learnersQ = `SELECT id, subjects FROM children WHERE grade = $1 AND (school_id = $2 OR $2 IS NULL)`;
    const params = [grade, schoolId];
    if (className && className !== 'All') {
      params.push(className);
      learnersQ += ` AND (class_name = $${params.length} OR class_id::text = $${params.length})`;
    }
    const { rows: learners } = await db.query(learnersQ, params);
    const totalLearners = learners.length;

    // 2. Fetch distinct subjects for this grade
    let subQuery = `SELECT DISTINCT name FROM subjects WHERE grade = $1 ORDER BY name ASC;`;
    let { rows: subRows } = await db.query(subQuery, [grade]);
    let subjects = subRows.map(s => s.name);
    if (subjects.length === 0) {
      if (stream.toLowerCase().includes('commerce')) {
        subjects = ['Accounting', 'Business Studies', 'Economics', 'Mathematics', 'English FAL', 'Life Orientation', 'Home Language'];
      } else {
        subjects = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation', 'Geography'];
      }
    }

    // 3. For each subject, query marks table for submissions
    const learnerIds = learners.map(l => l.id);
    const submissions = [];

    for (const sub of subjects) {
      let markCount = 0;
      let lastUploadedAt = null;
      let teacherInfo = 'Assigned Subject Teacher';

      if (learnerIds.length > 0) {
        const mRes = await db.query(
          `SELECT m.created_at, m.recorded_at, u.full_name, u.surname
           FROM marks m
           LEFT JOIN users u ON m.teacher_id = u.id
           WHERE (m.child_id = ANY($1) OR m.learner_id = ANY($1))
             AND (m.term = $2 OR m.term IS NULL)
             AND LOWER(m.subject) = LOWER($3)
           ORDER BY m.recorded_at DESC, m.created_at DESC`,
          [learnerIds, termNum, sub]
        );

        markCount = mRes.rows.length;
        if (mRes.rows[0]) {
          lastUploadedAt = mRes.rows[0].recorded_at || mRes.rows[0].created_at;
          if (mRes.rows[0].full_name) {
            teacherInfo = `${mRes.rows[0].full_name} ${mRes.rows[0].surname || ''}`.trim();
          }
        }
      }

      let status = 'PENDING';
      if (markCount >= totalLearners && totalLearners > 0) {
        status = 'SUBMITTED';
      } else if (markCount > 0) {
        status = 'PARTIAL';
      }

      submissions.push({
        subject: sub,
        status: status,
        marks_recorded: markCount,
        total_learners: totalLearners,
        teacher: teacherInfo,
        last_uploaded_at: lastUploadedAt
      });
    }

    const submittedCount = submissions.filter(s => s.status === 'SUBMITTED').length;
    const partialCount = submissions.filter(s => s.status === 'PARTIAL').length;
    const pendingCount = submissions.filter(s => s.status === 'PENDING').length;

    res.json({
      success: true,
      grade,
      class_name: className || 'All',
      term: termNum,
      total_learners: totalLearners,
      total_subjects: subjects.length,
      submitted_count: submittedCount,
      partial_count: partialCount,
      pending_count: pendingCount,
      can_transfer: (submittedCount + partialCount) > 0,
      submissions
    });
  } catch (err) {
    console.error('Error fetching teacher submissions overview:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve teacher mark submissions overview.' });
  }
};

/**
 * Admin Action: Transfers uploaded teacher marks to report card templates
 * and runs Option A AI prediction for each learner.
 */
exports.transferTeacherMarksToTemplate = async (req, res) => {
  try {
    const grade = parseInt(req.body.grade || '10', 10);
    const termNum = parseInt(String(req.body.term || '3').replace(/[^0-9]/g, ''), 10) || 3;
    const className = (req.body.class_name || req.body.class || req.body.className || '').trim();
    const stream = (req.body.stream || '').trim();
    const academicYear = parseInt(req.body.academic_year || req.body.academicYear || '2026', 10);
    const rawSchoolId = req.body.school_id || req.headers['x-school-id'] || req.user?.school_id || 1;
    const schoolId = parseInt(rawSchoolId, 10) || 1;

    // 1. Fetch learners
    const params = [schoolId, grade];
    let classClause = '';
    if (className && className !== 'All') {
      params.push(className);
      classClause = `AND (cl.name = $${params.length} OR c.class_id::text = $${params.length})`;
    }

    const { rows: learners } = await db.query(
      `SELECT c.id, c.learner_user_id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects,
              COALESCE(cl.name, CONCAT(c.grade, 'A')) as class_name
       FROM children c
       LEFT JOIN classes cl ON c.class_id = cl.id
       WHERE (c.school_id = $1 OR $1 IS NULL) AND c.grade = $2
       ${classClause}
       ORDER BY c.surname ASC, c.full_name ASC`,
      params
    );

    if (learners.length === 0) {
      return res.status(404).json({ success: false, error: 'No enrolled learners found for this grade and class.' });
    }

    let transferredCount = 0;

    for (const l of learners) {
      // Fetch ONLY recorded formal assessment marks (Strictly exclude informal practice/quizzes)
      const marksRes = await db.query(
        `SELECT subject, assessment_name, score, max_score, percentage, weight, is_formal, assessment_type
         FROM marks 
         WHERE (child_id = $1 OR learner_id = $1)
           AND (term = $2 OR term IS NULL)
           AND (is_formal = TRUE OR is_formal IS NULL)
         ORDER BY recorded_at ASC`,
        [l.id, termNum]
      );

      // Real Attendance from attendance register
      const attRes = await db.query(
        `SELECT 
           COUNT(*) as total_days,
           COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as days_present,
           COUNT(CASE WHEN status = 'absent' THEN 1 END) as days_absent
         FROM attendance WHERE child_id = $1`,
        [l.id]
      );
      const totalDays = parseInt(attRes.rows[0]?.total_days || '0', 10);
      const daysPresent = parseInt(attRes.rows[0]?.days_present || '0', 10);
      const daysAbsent = parseInt(attRes.rows[0]?.days_absent || (totalDays > 0 ? totalDays - daysPresent : '0'), 10);
      const attPct = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : null;

      // Group formal marks by subject with dynamic weighting
      const subjectMarksMap = {};
      marksRes.rows.forEach(m => {
        const sub = m.subject;
        if (!subjectMarksMap[sub]) subjectMarksMap[sub] = [];
        subjectMarksMap[sub].push(m);
      });

      // Student subject list — guarantee Geography is included for Science stream FET
      let subList = Array.isArray(l.subjects) && l.subjects.length > 0
        ? [...l.subjects]
        : ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'English FAL', 'Home Language', 'Life Orientation'];

      if (grade >= 10 && (l.stream === 'Science' || stream === 'Science')) {
        if (!subList.some(s => s.toLowerCase() === 'geography')) {
          subList.push('Geography');
        }
      }

      const subjectBreakdown = [];
      const scoresForAi = {};

      for (const sName of subList) {
        const matching = subjectMarksMap[sName] || [];
        if (matching.length > 0) {
          let totalWeight = 0;
          let weightedSum = 0;
          let sbaWeightSum = 0;
          let sbaTotalWeight = 0;
          let examWeightSum = 0;
          let examTotalWeight = 0;
          let rawScoreSum = 0;
          let maxScoreSum = 0;

          const detailedAssessments = matching.map(m => {
            const rawScore = Number(m.score) || 0;
            const maxScore = Number(m.max_score) || 100;
            const pct = m.percentage ? Number(m.percentage) : Math.round((rawScore / (maxScore || 100)) * 100);
            const w = Number(m.weight) || maxScore || 100;
            const aType = (m.assessment_type || m.assessment_name || '').toLowerCase();
            const isExam = aType.includes('exam') || aType.includes('examination');

            totalWeight += w;
            weightedSum += pct * w;
            rawScoreSum += rawScore;
            maxScoreSum += maxScore;

            if (isExam) {
              examWeightSum += pct * w;
              examTotalWeight += w;
            } else {
              sbaWeightSum += pct * w;
              sbaTotalWeight += w;
            }

            return {
              name: m.assessment_name || 'Formal Task',
              type: m.assessment_type || (isExam ? 'Examination' : 'Formal Assessment'),
              score: rawScore,
              max_score: maxScore,
              weight: w,
              percentage: pct
            };
          });

          const finalSubjectPct = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : Math.round(detailedAssessments[0].percentage);
          const sbaMark = sbaTotalWeight > 0 ? Math.round(sbaWeightSum / sbaTotalWeight) : finalSubjectPct;
          const examMark = examTotalWeight > 0 ? Math.round(examWeightSum / examTotalWeight) : null;
          const markDisplay = maxScoreSum > 0 ? `${rawScoreSum} / ${maxScoreSum}` : `${finalSubjectPct}%`;
          const caps = getCapsLevel(finalSubjectPct);

          subjectBreakdown.push({
            subject: sName,
            code: sName.substring(0, 4).toUpperCase(),
            mark_display: markDisplay,
            raw_score: rawScoreSum,
            max_score: maxScoreSum,
            mark: finalSubjectPct,
            percentage: finalSubjectPct,
            sba_mark: sbaMark,
            exam_mark: examMark,
            level: caps.level,
            rating: caps.rating,
            descriptor: caps.descriptor,
            badge: caps.badge,
            is_pending: false,
            assessments: detailedAssessments
          });
          scoresForAi[sName.toLowerCase()] = finalSubjectPct;
        } else {
          subjectBreakdown.push({
            subject: sName,
            code: sName.substring(0, 4).toUpperCase(),
            mark_display: '-',
            raw_score: null,
            max_score: null,
            mark: null,
            percentage: null,
            sba_mark: null,
            exam_mark: null,
            level: '-',
            rating: 'Pending Upload',
            descriptor: 'Teacher Marks Not Uploaded',
            badge: 'amber',
            is_pending: true,
            assessments: []
          });
        }
      }

      const gradedSubs = subjectBreakdown.filter(s => s.mark !== null && !s.is_pending);
      const hasAnyMarks = gradedSubs.length > 0;
      const overallAvg = hasAnyMarks ? Math.round(gradedSubs.reduce((sum, s) => sum + s.mark, 0) / gradedSubs.length) : null;
      const overallCaps = hasAnyMarks ? getCapsLevel(overallAvg) : { level: '-', rating: 'Pending' };
      const promotionDecision = hasAnyMarks ? calculateSouthAfricanPromotion(gradedSubs, overallAvg) : 'PENDING TEACHER MARKS';

      // 3. Run AI Advisor if learner has verified marks
      let aiAdvisory = null;
      if (hasAnyMarks) {
        const aiPayload = {
          grade: l.grade || grade,
          math_score: scoresForAi['mathematics'] || scoresForAi['maths'] || scoresForAi['math'] || overallAvg,
          physics_score: scoresForAi['physical sciences'] || scoresForAi['physics'] || scoresForAi['natural sciences'] || overallAvg,
          chemistry_score: scoresForAi['chemistry'] || scoresForAi['physical sciences'] || overallAvg,
          biology_score: scoresForAi['life sciences'] || scoresForAi['biology'] || overallAvg,
          english_score: scoresForAi['english fal'] || scoresForAi['english'] || scoresForAi['home language'] || overallAvg,
          history_score: scoresForAi['history'] || scoresForAi['social sciences'] || overallAvg,
          geography_score: scoresForAi['geography'] || overallAvg,
          ems_score: scoresForAi['ems'] || scoresForAi['economic and management sciences'] || scoresForAi['accounting'] || overallAvg,
          absence_days: daysAbsent,
          weekly_self_study_hours: 15,
          extracurricular_activities: 1
        };

        try {
          aiAdvisory = await aiAdvisorService.predictStudent(aiPayload);
        } catch (_) {}
      }

      // Upsert into report_cards table
      const existRes = await db.query(
        `SELECT id FROM report_cards WHERE child_id = $1 AND term = $2 AND academic_year = $3 LIMIT 1`,
        [l.id, termNum, academicYear]
      );

      if (existRes.rows.length > 0) {
        await db.query(
          `UPDATE report_cards
           SET marks_breakdown = $1,
               overall_average = $2,
               overall_level = $3,
               promotion_status = $4,
               days_present = $5,
               days_absent = $6,
               total_days = $7,
               attendance_percentage = $8,
               class_name = $9,
               stream = $10,
               ai_advisory = $11,
               updated_at = NOW()
           WHERE id = $12`,
          [
            JSON.stringify(subjectBreakdown),
            overallAvg,
            overallCaps.level,
            promotionDecision,
            daysPresent,
            daysAbsent,
            totalDays,
            attPct,
            l.class_name,
            l.stream || stream,
            aiAdvisory ? JSON.stringify(aiAdvisory) : null,
            existRes.rows[0].id
          ]
        );
      } else {
        await db.query(
          `INSERT INTO report_cards (
             school_id, child_id, grade, class_name, stream, term, academic_year,
             marks_breakdown, overall_average, overall_level, promotion_status,
             days_present, days_absent, total_days, attendance_percentage,
             teacher_comment, principal_comment, principal_signature,
             ai_advisory, is_published, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, FALSE, NOW(), NOW())`,
          [
            schoolId,
            l.id,
            grade,
            l.class_name,
            l.stream || stream,
            termNum,
            academicYear,
            JSON.stringify(subjectBreakdown),
            overallAvg,
            overallCaps.level,
            promotionDecision,
            daysPresent,
            daysAbsent,
            totalDays,
            attPct,
            'Teacher marks transferred to official template.',
            'Awaiting final end-of-term certification.',
            'Dr. T. Makola (Signed)',
            aiAdvisory ? JSON.stringify(aiAdvisory) : null
          ]
        );
      }
      transferredCount++;
    }

    res.json({
      success: true,
      message: `Successfully transferred uploaded marks for ${transferredCount} learners in Grade ${grade} (${className || 'All'}) into official report card templates! AI pathways and risk analysis calculated.`,
      transferred_count: transferredCount
    });
  } catch (err) {
    console.error('Error transferring teacher marks to template:', err);
    res.status(500).json({ success: false, error: 'Failed to transfer teacher marks: ' + err.message });
  }
};
