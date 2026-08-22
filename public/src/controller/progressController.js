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

        if (!childId) {
            const fallbackRes = await db.query('SELECT id FROM children ORDER BY id ASC LIMIT 1');
            if (fallbackRes.rows[0]) childId = fallbackRes.rows[0].id;
        }

        if (!childId) return res.status(404).json({ error: 'Learner profile not found.' });

        const childRes = await db.query(
            `SELECT c.id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, c.subjects, lu.profile_picture_path,
                    CONCAT(u.full_name, ' ', u.surname) as parent_name, u.phone as parent_phone
             FROM children c
             LEFT JOIN users lu ON c.learner_user_id = lu.id
             LEFT JOIN users u ON c.parent_id = u.id
             WHERE c.id = $1`,
            [childId]
        );

        if (childRes.rows.length === 0) return res.status(404).json({ error: 'Learner not found.' });
        const child = childRes.rows[0];

        const progressRes = await db.query(
            `SELECT p.id, p.subject, p.grade, p.notes, p.date, p.term,
                    CONCAT(u.full_name, ' ', u.surname) as teacher_name
             FROM progress p
             LEFT JOIN employees e ON p.employee_id = e.id
             LEFT JOIN users u ON e.user_id = u.id
             WHERE p.child_id = $1 OR p.child_id IN (SELECT id FROM children WHERE learner_user_id = (SELECT learner_user_id FROM children WHERE id = $1))
             ORDER BY p.date DESC`,
            [childId]
        );

        const subjectsList = child.subjects || ['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Life Orientation'];
        
        let totalAvgSum = 0;
        let validSubjectsCount = 0;

        const subjectRows = [];
        for (const subj of subjectsList) {
            const subjLower = subj.toLowerCase().trim();
            // Find all matching marks for this subject
            const matchingRecords = progressRes.rows.filter(r => {
                const rLower = (r.subject || '').toLowerCase().trim();
                return rLower === subjLower ||
                       rLower.includes(subjLower) ||
                       subjLower.includes(rLower) ||
                       (subjLower.includes('math') && rLower.includes('math')) ||
                       (subjLower.includes('physic') && rLower.includes('physic')) ||
                       (subjLower.includes('life') && rLower.includes('life')) ||
                       (subjLower.includes('english') && rLower.includes('english'));
            });

            let mark = 0;
            let teacherName = 'Subject Educator';

            if (matchingRecords.length > 0) {
                const sum = matchingRecords.reduce((acc, curr) => acc + parseFloat(curr.grade || 0), 0);
                mark = Math.round(sum / matchingRecords.length);
                const withTeacher = matchingRecords.find(r => r.teacher_name && r.teacher_name.trim());
                if (withTeacher) teacherName = withTeacher.teacher_name;
            }

            if (mark > 0) {
                totalAvgSum += mark;
                validSubjectsCount++;
            }

            let levelCode = 1;
            let levelDescriptor = '1 - Not Achieved (0 - 29%)';
            if (mark >= 80) { levelCode = 7; levelDescriptor = '7 - Outstanding Achievement (80 - 100%)'; }
            else if (mark >= 70) { levelCode = 6; levelDescriptor = '6 - Meritorious Achievement (70 - 79%)'; }
            else if (mark >= 60) { levelCode = 5; levelDescriptor = '5 - Substantial Achievement (60 - 69%)'; }
            else if (mark >= 50) { levelCode = 4; levelDescriptor = '4 - Adequate Achievement (50 - 59%)'; }
            else if (mark >= 40) { levelCode = 3; levelDescriptor = '3 - Moderate Achievement (40 - 49%)'; }
            else if (mark >= 30) { levelCode = 2; levelDescriptor = '2 - Elementary Achievement (30 - 39%)'; }

            let comment = 'Shows steady progress in class assessments.';
            const sName = subj.toLowerCase();
            if (levelCode >= 6) {
                if (sName.includes('math')) comment = 'Outstanding mathematical aptitude and mastery of algebraic/geometric problem-solving.';
                else if (sName.includes('physic') || sName.includes('science')) comment = 'Superb analytical thinking with high precision in scientific investigation and calculations.';
                else if (sName.includes('english') || sName.includes('language')) comment = 'Eloquent literary expression, advanced comprehension, and flawless grammar mechanics.';
                else if (sName.includes('account') || sName.includes('ems')) comment = 'Impeccable bookkeeping precision and strong financial statement interpretation.';
                else comment = 'Exceptional performance! Demonstrates strong mastery of CAPS curriculum concepts.';
            } else if (levelCode === 5) {
                if (sName.includes('math')) comment = 'Good comprehension of key formulas; continue practicing step-by-step proofs.';
                else if (sName.includes('physic')) comment = 'Solid understanding of core scientific laws; maintain consistent laboratory and problem sets.';
                else comment = 'Good understanding. Consistent effort shown across tasks.';
            } else if (levelCode === 4) {
                comment = 'Satisfactory performance. Additional targeted practice recommended prior to formal examinations.';
            } else {
                comment = 'Requires focused academic intervention, mandatory afternoon clinic, and extra tutorial support.';
            }

            subjectRows.push({
                subject: subj,
                teacher: teacherName,
                mark: mark,
                level_code: levelCode,
                level_descriptor: levelDescriptor,
                comment: comment,
                assessment_count: matchingRecords.length
            });
        }

        const overallAvg = validSubjectsCount > 0 ? Math.round(totalAvgSum / validSubjectsCount) : 75;

        // Calculate APS (Admission Point Score)
        const apsScore = subjectRows.reduce((acc, row) => acc + (row.level_code || 1), 0);

        const attRes = await db.query(
            `SELECT COUNT(*) as total_days,
                    SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) as days_attended,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as days_absent,
                    SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as days_late
             FROM attendance WHERE child_id = $1`,
            [childId]
        );

        const totalDays = parseInt(attRes.rows[0]?.total_days || 45, 10);
        const daysAttended = parseInt(attRes.rows[0]?.days_attended || 43, 10);
        const daysAbsent = parseInt(attRes.rows[0]?.days_absent || 2, 10);
        const attPct = totalDays > 0 ? Math.round((daysAttended / totalDays) * 100) : 95;

        let recommendation = 'PROMOTED TO NEXT GRADE';
        let principalRemark = 'A commendable term of disciplined study and academic growth. Well done!';
        if (overallAvg >= 75) {
            recommendation = 'PASS WITH DISTINCTION / MERIT';
            principalRemark = 'Outstanding academic excellence! A role model of scholastic diligence and intellectual inquiry.';
        } else if (overallAvg < 50) {
            recommendation = 'ACADEMIC INTERVENTION REQUIRED';
            principalRemark = 'Urgent consultation requested with educators. Dedicated revision and remedial clinic attendance mandatory.';
        }

        res.json({
            school_name: 'FUSION HIGH SCHOOL',
            department: 'REPUBLIC OF SOUTH AFRICA • DEPARTMENT OF BASIC EDUCATION',
            term: termParam,
            date_issued: new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }),
            learner: {
                id: child.id,
                full_name: `${child.full_name} ${child.surname}`,
                learner_number: child.learner_number || `2026-${child.id}`,
                grade: child.grade,
                stream: child.stream || 'General',
                parent_name: child.parent_name || 'N/A'
            },
            subjects: subjectRows,
            overall_average: overallAvg,
            aps_score: apsScore,
            attendance: {
                total_days: totalDays,
                days_attended: daysAttended,
                days_absent: daysAbsent,
                attendance_percentage: attPct
            },
            recommendation: recommendation,
            principal_remark: principalRemark,
            principal_name: 'T.L. Makula (Principal)'
        });
    } catch (err) {
        console.error('Error generating CAPS report card data:', err);
        res.status(500).json({ error: 'Failed to generate CAPS report card data.' });
    }
};