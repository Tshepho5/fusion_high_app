const db = require('../../../db/db');

exports.getLearnerProgress = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT p.id, p.subject, p.grade, p.grade as score, p.grade as percentage, 
              p.notes, p.notes as insight, p.notes as aiInsight, p.date, p.term, p.time_taken_seconds 
       FROM progress p JOIN children c ON p.child_id = c.id 
       WHERE c.learner_user_id = $1 ORDER BY p.date DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getChildProgress = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, subject, grade, grade as score, grade as percentage, 
              notes, notes as insight, notes as aiInsight, date, term, time_taken_seconds 
       FROM progress WHERE child_id = $1 ORDER BY date DESC`,
            [req.params.childId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addProgress = async (req, res) => {
    const { child_id, subject, grade, notes, term } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO progress (child_id, subject, grade, notes, term, employee_id) VALUES ($1, $2, $3, $4, $5, (SELECT id FROM employees WHERE user_id = $6)) RETURNING *',
            [child_id, subject, grade, notes, term || 'Term 1', req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getCapsReportCardData = async (req, res) => {
    try {
        let childId = req.query.child_id || req.params.childId;
        const termParam = req.query.term || 'Term 3 2026';

        if (!childId && req.user && req.user.role === 'learner') {
            const childRes = await db.query('SELECT id FROM children WHERE learner_user_id = $1', [req.user.id]);
            if (childRes.rows[0]) childId = childRes.rows[0].id;
        }

        if (!childId && req.user && req.user.role === 'parent') {
            const parentChildRes = await db.query(
                `SELECT c.id FROM children c
                 LEFT JOIN parent_children pc ON pc.child_id = c.id
                 WHERE c.parent_id = $1 OR c.secondary_parent_id = $1 OR pc.parent_id = $1
                 ORDER BY c.id ASC LIMIT 1`,
                [req.user.id]
            );
            if (parentChildRes.rows[0]) {
                childId = parentChildRes.rows[0].id;
            } else {
                return res.json({
                    success: false,
                    no_linked_children: true,
                    error: 'No linked children found. Link a child in settings to view their CAPS report card.'
                });
            }
        }

        if (!childId && req.user && req.user.role === 'admin') {
            const fallbackRes = await db.query('SELECT id FROM children ORDER BY id ASC LIMIT 1');
            if (fallbackRes.rows[0]) childId = fallbackRes.rows[0].id;
        }

        if (!childId) {
            return res.status(404).json({
                success: false,
                no_linked_children: true,
                error: 'Learner profile not found.'
            });
        }

        const childRes = await db.query(
            `SELECT c.id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects, lu.profile_picture_path,
                    CONCAT(u.full_name, ' ', u.surname) as parent_name, u.phone as parent_phone,
                    cl.name as class_name,
                    s.name as school_name, s.emis_number, s.circuit, s.district, s.province,
                    s.physical_address, s.contact_email, s.contact_phone, s.principal_name
             FROM children c
             LEFT JOIN users lu ON c.learner_user_id = lu.id
             LEFT JOIN users u ON c.parent_id = u.id
             LEFT JOIN classes cl ON c.class_id = cl.id
             LEFT JOIN schools s ON c.school_id = s.id
             WHERE c.id = $1`,
            [childId]
        );

        if (childRes.rows.length === 0) return res.status(404).json({ error: 'Learner not found.' });
        const child = childRes.rows[0];

        // Parse requested term and academic year
        const termNum = parseInt(String(termParam).replace(/[^0-9]/g, ''), 10) || 3;
        const yearMatch = String(termParam).match(/\b(20\d\d)\b/);
        const academicYear = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
        const userRole = (req.user?.role || '').toLowerCase();

        // 1. Check if an official compiled report card exists in report_cards table
        const cardRes = await db.query(
            `SELECT * FROM report_cards
             WHERE child_id = $1 AND term = $2
             ORDER BY academic_year DESC, id DESC LIMIT 1`,
            [childId, termNum]
        );

        const compiledCard = cardRes.rows[0];

        // If requester is a parent or learner and the card is NOT yet published by admin:
        if ((userRole === 'parent' || userRole === 'learner') && (!compiledCard || !compiledCard.is_published)) {
            return res.json({
                success: true,
                is_published: false,
                not_published: true,
                message: 'Official CAPS Report Card for this term has not yet been published by the administration.',
                term: termParam,
                learner: {
                    id: child.id,
                    full_name: `${child.full_name} ${child.surname}`.trim(),
                    learner_number: child.learner_number || '',
                    grade: child.grade,
                    stream: child.stream || 'General',
                    class_name: child.class_name || `${child.grade}A`
                },
                school: {
                    name: child.school_name || 'FUSION HIGH COMPREHENSIVE SCHOOL',
                    province: child.province || 'Gauteng Province',
                    circuit: child.circuit || 'Central Circuit 01',
                    district: child.district || 'Johannesburg North District',
                    emis_number: child.emis_number || '700400192',
                    principal_name: child.principal_name || 'Dr. T. Makola'
                }
            });
        }

        // Helper function for CAPS rating descriptors
        const getCapsDescriptor = (mark) => {
            if (mark === null || mark === undefined) return { level: '-', descriptor: 'Pending Teacher Mark' };
            const m = Math.round(Number(mark));
            if (m >= 80) return { level: 7, descriptor: 'Outstanding Achievement' };
            if (m >= 70) return { level: 6, descriptor: 'Meritorious Achievement' };
            if (m >= 60) return { level: 5, descriptor: 'Substantial Achievement' };
            if (m >= 50) return { level: 4, descriptor: 'Adequate Achievement' };
            if (m >= 40) return { level: 3, descriptor: 'Moderate Achievement' };
            if (m >= 30) return { level: 2, descriptor: 'Elementary Achievement' };
            return { level: 1, descriptor: 'Not Achieved' };
        };

        // If an official report card was compiled/saved by the admin, serve that verified record directly
        if (compiledCard) {
            let subjects = [];
            if (Array.isArray(compiledCard.marks_breakdown)) {
                subjects = compiledCard.marks_breakdown;
            } else if (typeof compiledCard.marks_breakdown === 'string') {
                try {
                    subjects = JSON.parse(compiledCard.marks_breakdown);
                } catch (_) {
                    subjects = [];
                }
            }

            const formattedSubjects = subjects.map(s => {
                const mark = s.mark !== null && s.mark !== undefined && !s.is_pending ? Number(s.mark) : null;
                const caps = getCapsDescriptor(mark);
                return {
                    subject: s.subject || s.name,
                    code: s.code || (s.subject || s.name || '').substring(0, 4).toUpperCase(),
                    sba_mark: s.sba_mark !== undefined ? s.sba_mark : mark,
                    exam_mark: s.exam_mark !== undefined ? s.exam_mark : mark,
                    mark: mark,
                    level_code: caps.level,
                    level_descriptor: caps.descriptor,
                    comment: s.comment || s.teacher_comment || (mark !== null ? 'Diligent application and steady curriculum progress demonstrated.' : 'Pending teacher upload.'),
                    teacher: s.teacher || 'Subject Educator'
                };
            });

            const hasAvg = compiledCard.overall_average !== null && compiledCard.overall_average !== undefined;
            const avgNum = hasAvg ? Number(compiledCard.overall_average) : null;

            return res.json({
                success: true,
                is_published: !!compiledCard.is_published,
                term: termParam,
                date_issued: compiledCard.published_at
                    ? new Date(compiledCard.published_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
                    : new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
                school: {
                    name: child.school_name || 'FUSION HIGH COMPREHENSIVE SCHOOL',
                    province: child.province || 'Gauteng Province',
                    circuit: child.circuit || 'Central Circuit 01',
                    district: child.district || 'Johannesburg North District',
                    emis_number: child.emis_number || '700400192',
                    exam_centre_no: '820194',
                    principal_name: child.principal_name || 'Dr. T. Makola'
                },
                learner: {
                    id: child.id,
                    full_name: `${child.full_name} ${child.surname}`.trim(),
                    learner_number: child.learner_number || `2026-FHS-${String(child.id).padStart(3, '0')}`,
                    grade: child.grade,
                    stream: compiledCard.stream || child.stream || 'Science',
                    class_name: compiledCard.class_name || child.class_name || `${child.grade}A`,
                    parent_name: child.parent_name || 'Guardian'
                },
                subjects: formattedSubjects,
                overall_average: avgNum,
                overall_level: compiledCard.overall_level !== undefined ? compiledCard.overall_level : (avgNum !== null ? getCapsDescriptor(avgNum).level : '-'),
                promotion_status: compiledCard.promotion_status || (avgNum !== null ? (avgNum >= 50 ? "PROMOTED — PASS WITH BACHELOR'S DEGREE ADMISSION (CAPS REG. 3(1))" : 'PROMOTED — DIPLOMA PASS') : 'PENDING MARKS'),
                attendance: {
                    total_days: compiledCard.total_days || 0,
                    days_present: compiledCard.days_present || 0,
                    days_absent: compiledCard.days_absent || 0,
                    attendance_percentage: compiledCard.attendance_percentage !== null && compiledCard.attendance_percentage !== undefined ? `${compiledCard.attendance_percentage}%` : '-'
                },
                teacher_comment: compiledCard.teacher_comment || (avgNum !== null ? 'Consistently maintains good academic focus and discipline.' : 'Awaiting marks upload.'),
                principal_comment: compiledCard.principal_comment || (avgNum !== null ? 'Satisfactory academic progress. Promotion criteria fulfilled.' : 'Official term marks pending publishing.'),
                principal_name: child.principal_name || 'Dr. T. Makola'
            });
        }

        // If no compiled report card exists yet, query real marks table directly for admin/teacher view
        const progressRes = await db.query(
            `SELECT p.id, p.subject, p.grade, p.notes, p.date, p.term,
                    CONCAT(u.full_name, ' ', u.surname) as teacher_name
             FROM progress p
             LEFT JOIN employees e ON p.employee_id = e.id
             LEFT JOIN users u ON e.user_id = u.id
             WHERE p.child_id = $1
             ORDER BY p.date DESC`,
            [childId]
        );

        const marksRes = await db.query(
            `SELECT subject, score, max_score, percentage, term
             FROM marks
             WHERE child_id = $1 AND (term = $2 OR term IS NULL)
             ORDER BY recorded_at DESC`,
            [childId, termNum]
        );

        const subjectsList = Array.isArray(child.subjects) && child.subjects.length > 0
            ? child.subjects
            : ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation', 'Geography'];
        
        let totalAvgSum = 0;
        let validSubjectsCount = 0;

        const subjectRows = [];
        for (const subj of subjectsList) {
            const subjLower = subj.toLowerCase().trim();
            const matchingMarks = marksRes.rows.filter(m => (m.subject || '').toLowerCase().trim() === subjLower);
            const matchingProg = progressRes.rows.filter(r => (r.subject || '').toLowerCase().trim() === subjLower);

            let mark = null;
            let teacherName = 'Subject Educator';

            if (matchingMarks.length > 0) {
                const markItem = matchingMarks[0];
                mark = markItem.percentage !== null && markItem.percentage !== undefined
                    ? Math.round(Number(markItem.percentage))
                    : Math.round((Number(markItem.score || 0) / Number(markItem.max_score || 100)) * 100);
            } else if (matchingProg.length > 0) {
                const sum = matchingProg.reduce((acc, curr) => acc + parseFloat(curr.grade || 0), 0);
                mark = Math.round(sum / matchingProg.length);
                const withTeacher = matchingProg.find(r => r.teacher_name && r.teacher_name.trim());
                if (withTeacher) teacherName = withTeacher.teacher_name;
            }

            if (mark !== null && !isNaN(mark)) {
                totalAvgSum += mark;
                validSubjectsCount++;
            }

            const caps = getCapsDescriptor(mark);

            subjectRows.push({
                subject: subj,
                code: subj.substring(0, 4).toUpperCase(),
                teacher: teacherName,
                sba_mark: mark,
                exam_mark: mark,
                mark: mark,
                level_code: caps.level,
                level_descriptor: caps.descriptor,
                comment: mark !== null
                    ? (mark >= 70 ? 'Consistently shows high analytical aptitude and mastery of curriculum.' : 'Steady effort and positive progress shown.')
                    : 'Pending Teacher Marks Upload',
                assessment_count: matchingMarks.length + matchingProg.length
            });
        }

        const overallAvg = validSubjectsCount > 0 ? Math.round(totalAvgSum / validSubjectsCount) : null;
        const overallCaps = getCapsDescriptor(overallAvg);

        // Fetch real attendance
        const attRes = await db.query(
            `SELECT COUNT(*) as total_days,
                    SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) as days_attended,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as days_absent
             FROM attendance WHERE child_id = $1`,
            [childId]
        );

        const totalDays = parseInt(attRes.rows[0]?.total_days || '0', 10);
        const daysAttended = parseInt(attRes.rows[0]?.days_attended || '0', 10);
        const daysAbsent = parseInt(attRes.rows[0]?.days_absent || '0', 10);
        const attPct = totalDays > 0 ? `${Math.round((daysAttended / totalDays) * 100)}%` : '-';

        let recommendation = overallAvg !== null
            ? (overallAvg >= 50 ? "PROMOTED — PASS WITH BACHELOR'S DEGREE ADMISSION (CAPS REG. 3(1))" : 'PROMOTED — DIPLOMA PASS')
            : 'PENDING TEACHER MARKS';

        let principalRemark = overallAvg !== null
            ? (overallAvg >= 75 ? 'Commendable scholastic performance and dedication to excellence.' : 'Satisfactory achievement. Encouraged to aim higher next term.')
            : 'Awaiting official mark compilation and publication by administration.';

        res.json({
            success: true,
            is_published: false,
            term: termParam,
            date_issued: new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
            school: {
                name: child.school_name || 'FUSION HIGH COMPREHENSIVE SCHOOL',
                province: child.province || 'Gauteng Province',
                circuit: child.circuit || 'Central Circuit 01',
                district: child.district || 'Johannesburg North District',
                emis_number: child.emis_number || '700400192',
                exam_centre_no: '820194',
                principal_name: child.principal_name || 'Dr. T. Makola'
            },
            learner: {
                id: child.id,
                full_name: `${child.full_name} ${child.surname}`.trim(),
                learner_number: child.learner_number || `2026-FHS-${String(child.id).padStart(3, '0')}`,
                grade: child.grade,
                stream: child.stream || 'Science',
                class_name: child.class_name || `${child.grade}A`,
                parent_name: child.parent_name || 'N/A'
            },
            subjects: subjectRows,
            overall_average: overallAvg,
            overall_level: overallCaps.level,
            promotion_status: recommendation,
            attendance: {
                total_days: totalDays,
                days_present: daysAttended,
                days_absent: daysAbsent,
                attendance_percentage: attPct
            },
            teacher_comment: overallAvg !== null ? 'Maintains positive attitude and diligent study habits.' : 'Awaiting marks upload.',
            principal_comment: principalRemark,
            principal_name: child.principal_name || 'Dr. T. Makola'
        });
    } catch (err) {
        console.error('Error generating CAPS report card data:', err);
        res.status(500).json({ error: 'Failed to generate CAPS report card data: ' + err.message });
    }
};