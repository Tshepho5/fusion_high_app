const db = require('../../../../db/db');
const curriculumService = require('../curriculumService');

/**
 * Tool definitions conforming to Google Gemini FunctionDeclaration schema
 */
const TOOL_DEFINITIONS = [
    {
        name: 'get_my_timetable',
        description: 'Retrieves the weekly timetable schedule for the authenticated learner, including periods, subjects, and times.',
        parameters: {
            type: 'OBJECT',
            properties: {
                day: {
                    type: 'STRING',
                    description: 'Optional day of the week to filter by (e.g., Monday, Tuesday)'
                }
            }
        },
        allowedRoles: ['learner']
    },
    {
        name: 'get_my_assignments',
        description: 'Retrieves active and upcoming homework, tests, and assessments for the authenticated learner.',
        parameters: {
            type: 'OBJECT',
            properties: {
                subject: {
                    type: 'STRING',
                    description: 'Optional subject filter (e.g., Mathematics, Physical Sciences)'
                }
            }
        },
        allowedRoles: ['learner']
    },
    {
        name: 'get_my_marks_summary',
        description: 'Calculates verified academic marks, term report card averages, and achievement levels for the authenticated learner.',
        parameters: {
            type: 'OBJECT',
            properties: {
                term: {
                    type: 'INTEGER',
                    description: 'Optional term number (1, 2, 3, or 4)'
                }
            }
        },
        allowedRoles: ['learner']
    },
    {
        name: 'get_parent_children',
        description: 'Lists all verified learners linked to the authenticated parent or guardian.',
        parameters: {
            type: 'OBJECT',
            properties: {}
        },
        allowedRoles: ['parent']
    },
    {
        name: 'get_child_academic_summary',
        description: 'Retrieves verified marks, attendance percentages, and educator comments for a specific linked child of the parent. Strict RBAC enforced.',
        parameters: {
            type: 'OBJECT',
            properties: {
                child_id: {
                    type: 'INTEGER',
                    description: 'The ID of the child learner to inspect'
                }
            },
            required: ['child_id']
        },
        allowedRoles: ['parent']
    },
    {
        name: 'get_school_announcements',
        description: 'Retrieves verified school announcements, notices, and upcoming academic events for the user school.',
        parameters: {
            type: 'OBJECT',
            properties: {
                limit: {
                    type: 'INTEGER',
                    description: 'Maximum number of announcements to return (default 5)'
                }
            }
        },
        allowedRoles: ['learner', 'teacher', 'parent', 'admin', 'visitor']
    },
    {
        name: 'get_curriculum_topics',
        description: 'Retrieves official South African CAPS curriculum topics, terms, and cognitive requirements for a grade and subject.',
        parameters: {
            type: 'OBJECT',
            properties: {
                subject: {
                    type: 'STRING',
                    description: 'The subject name (e.g. Mathematics, Physical Sciences, Life Sciences)'
                },
                grade: {
                    type: 'INTEGER',
                    description: 'Grade level (8 through 12)'
                }
            },
            required: ['subject']
        },
        allowedRoles: ['learner', 'teacher', 'parent', 'admin', 'visitor']
    },
    {
        name: 'get_teacher_classes',
        description: 'Lists the classes, subjects, and learner counts assigned to the authenticated teacher.',
        parameters: {
            type: 'OBJECT',
            properties: {}
        },
        allowedRoles: ['teacher']
    },
    {
        name: 'search_school_knowledge',
        description: 'Searches approved South African CAPS curriculum guidelines, past paper model solutions, official attendance policies, and school rules using RAG.',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: {
                    type: 'STRING',
                    description: 'The search query or concept to look up in school documents or curriculum'
                },
                subject: {
                    type: 'STRING',
                    description: 'Optional subject filter (e.g. Mathematics, Physical Sciences, Life Sciences)'
                },
                grade: {
                    type: 'INTEGER',
                    description: 'Optional grade filter (8 through 12)'
                }
            },
            required: ['query']
        },
        allowedRoles: ['learner', 'teacher', 'parent', 'admin', 'visitor']
    },
    {
        name: 'get_school_overview_stats',
        description: 'Calculates administrative summary statistics (total enrolled learners, educators, attendance rate) for school leadership.',
        parameters: {
            type: 'OBJECT',
            properties: {}
        },
        allowedRoles: ['admin']
    }
];

/**
 * Server-side tool execution handlers with strict authorization checks
 */
const TOOL_HANDLERS = {
    async get_my_timetable(args, context) {
        const userId = context.user.id;
        // Resolve learner class
        const childRes = await db.query(
            `SELECT c.id, c.grade, c.stream, c.class_id, cl.name as class_name 
             FROM children c
             LEFT JOIN classes cl ON c.class_id = cl.id
             WHERE c.learner_user_id = $1 OR c.id::text = $1::text
             LIMIT 1`,
            [String(userId)]
        );

        if (childRes.rows.length === 0) {
            return { error: 'Learner profile not found for timetable lookup.' };
        }

        const child = childRes.rows[0];
        const ttRes = await db.query(
            `SELECT name, grade, stream, timetable_data 
             FROM timetables 
             WHERE is_active = TRUE AND (grade = $1 OR stream = $2)
             ORDER BY id DESC LIMIT 1`,
            [child.grade, child.stream]
        );

        if (ttRes.rows.length === 0) {
            return {
                grade: child.grade,
                className: child.class_name,
                message: 'No published timetable found for your grade. Contact your administrator.'
            };
        }

        const data = ttRes.rows[0].timetable_data;
        if (args.day && typeof data === 'object') {
            const dayKey = Object.keys(data).find(k => k.toLowerCase() === args.day.toLowerCase());
            return {
                grade: child.grade,
                className: child.class_name,
                day: args.day,
                schedule: dayKey ? data[dayKey] : `No lessons scheduled for ${args.day}`
            };
        }

        return {
            grade: child.grade,
            className: child.class_name,
            schedule: data
        };
    },

    async get_my_assignments(args, context) {
        const userId = context.user.id;
        const childRes = await db.query(
            `SELECT id, grade, class_id FROM children WHERE learner_user_id = $1 OR id::text = $1::text LIMIT 1`,
            [String(userId)]
        );

        if (childRes.rows.length === 0) {
            return { error: 'Learner profile not found.' };
        }

        const child = childRes.rows[0];
        let query = `
            SELECT id, name, subject, total_marks, date_due, instructions, status
            FROM assessments
            WHERE (class_id = $1 OR grade = $2)
        `;
        const params = [child.class_id, child.grade];

        if (args.subject) {
            params.push(`%${args.subject}%`);
            query += ` AND subject ILIKE $${params.length}`;
        }
        query += ` ORDER BY date_due ASC LIMIT 10`;

        const res = await db.query(query, params);
        return {
            totalAssignments: res.rows.length,
            assignments: res.rows.map(r => ({
                id: r.id,
                title: r.name,
                subject: r.subject,
                totalMarks: r.total_marks,
                dueDate: r.date_due,
                status: r.status,
                instructions: r.instructions
            }))
        };
    },

    async get_my_marks_summary(args, context) {
        const userId = context.user.id;
        const childRes = await db.query(
            `SELECT id, full_name, surname, grade FROM children WHERE learner_user_id = $1 OR id::text = $1::text LIMIT 1`,
            [String(userId)]
        );

        if (childRes.rows.length === 0) {
            return { error: 'Learner profile not found.' };
        }

        const child = childRes.rows[0];

        // 1. Report card summary
        const rcRes = await db.query(
            `SELECT term, overall_average, overall_level, marks_breakdown 
             FROM report_cards 
             WHERE child_id = $1 AND is_published = TRUE
             ORDER BY term DESC`,
            [child.id]
        );

        // 2. Recent assessment results with deterministic averages
        const marksRes = await db.query(
            `SELECT a.name, a.subject, a.total_marks, ar.score, ar.submission_date, ar.feedback
             FROM assessment_results ar
             JOIN assessments a ON ar.assessment_id = a.id
             WHERE ar.child_id = $1
             ORDER BY ar.submission_date DESC LIMIT 15`,
            [child.id]
        );

        let totalScore = 0;
        let totalMax = 0;
        const items = marksRes.rows.map(r => {
            const sc = parseFloat(r.score) || 0;
            const mx = parseFloat(r.total_marks) || 100;
            totalScore += sc;
            totalMax += mx;
            const pct = mx > 0 ? Math.round((sc / mx) * 100) : 0;
            return {
                task: r.name,
                subject: r.subject,
                score: `${sc}/${mx}`,
                percentage: `${pct}%`,
                feedback: r.feedback
            };
        });

        const overallAssessmentAvg = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;

        return {
            learnerName: `${child.full_name} ${child.surname}`,
            grade: child.grade,
            overallAssessmentAverage: overallAssessmentAvg ? `${overallAssessmentAvg}%` : 'N/A',
            recentTasks: items,
            termReports: rcRes.rows.map(rc => ({
                term: rc.term,
                overallAverage: `${rc.overall_average}%`,
                achievementLevel: rc.overall_level,
                breakdown: rc.marks_breakdown
            }))
        };
    },

    async get_parent_children(args, context) {
        const parentId = context.user.id;
        const res = await db.query(
            `SELECT c.id, c.full_name, c.surname, c.learner_number, c.grade, c.stream, cl.name as class_name
             FROM children c
             LEFT JOIN classes cl ON c.class_id = cl.id
             WHERE c.parent_id = $1 
                OR c.id IN (SELECT child_id FROM parent_children WHERE parent_id = $1)
             ORDER BY c.full_name ASC`,
            [parentId]
        );

        return {
            count: res.rows.length,
            children: res.rows.map(c => ({
                childId: c.id,
                fullName: `${c.full_name} ${c.surname}`,
                learnerNumber: c.learner_number,
                grade: c.grade,
                stream: c.stream,
                className: c.class_name || `${c.grade} General`
            }))
        };
    },

    async get_child_academic_summary(args, context) {
        const parentId = context.user.id;
        const childId = parseInt(args.child_id, 10);

        if (!childId) {
            return { error: 'Please specify a valid child_id.' };
        }

        // Strict Object-Level Access Control: Verify child belongs to parent
        const verifyRes = await db.query(
            `SELECT c.id, c.full_name, c.surname, c.grade, c.learner_number
             FROM children c
             WHERE c.id = $1 
               AND (c.parent_id = $2 OR c.id IN (SELECT child_id FROM parent_children WHERE parent_id = $2))
             LIMIT 1`,
            [childId, parentId]
        );

        if (verifyRes.rows.length === 0) {
            return {
                error: 'Unauthorized: You are not authorized to view academic records for this learner.'
            };
        }

        const child = verifyRes.rows[0];

        // Deterministic Attendance Calculation
        const attRes = await db.query(
            `SELECT status, COUNT(*)::int as count 
             FROM attendance 
             WHERE child_id = $1 
             GROUP BY status`,
            [childId]
        );

        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let totalSessions = 0;

        attRes.rows.forEach(r => {
            const c = parseInt(r.count, 10) || 0;
            totalSessions += c;
            if (r.status === 'present') presentCount += c;
            else if (r.status === 'absent') absentCount += c;
            else if (r.status === 'late') lateCount += c;
        });

        const attendanceRate = totalSessions > 0
            ? Math.round(((presentCount + (lateCount * 0.5)) / totalSessions) * 100)
            : 100;

        // Marks summary
        const rcRes = await db.query(
            `SELECT term, overall_average, overall_level, marks_breakdown, teacher_comment, principal_comment
             FROM report_cards
             WHERE child_id = $1 AND is_published = TRUE
             ORDER BY term DESC LIMIT 1`,
            [childId]
        );

        const latestReport = rcRes.rows[0] || null;

        return {
            childName: `${child.full_name} ${child.surname}`,
            learnerNumber: child.learner_number,
            grade: child.grade,
            attendance: {
                totalTrackedDays: totalSessions,
                present: presentCount,
                absent: absentCount,
                late: lateCount,
                attendancePercentage: `${attendanceRate}%`,
                statusNote: attendanceRate >= 80 ? 'Good Attendance' : 'Attendance Concern - Under 80%'
            },
            latestReportCard: latestReport ? {
                term: latestReport.term,
                overallAverage: `${latestReport.overall_average}%`,
                achievementLevel: latestReport.overall_level,
                teacherComment: latestReport.teacher_comment,
                subjects: latestReport.marks_breakdown
            } : 'No official term report published yet.'
        };
    },

    async get_school_announcements(args, context) {
        const limit = Math.min(args.limit || 5, 10);
        const role = context.user.role || 'learner';
        const res = await db.query(
            `SELECT title, content, grade_target, role_target, created_at 
             FROM announcements
             WHERE role_target IN ('all', $1)
             ORDER BY created_at DESC LIMIT $2`,
            [role, limit]
        );

        return {
            totalAnnouncements: res.rows.length,
            announcements: res.rows.map(a => ({
                title: a.title,
                content: a.content,
                target: a.role_target,
                date: a.created_at
            }))
        };
    },

    async get_curriculum_topics(args) {
        const grade = parseInt(args.grade, 10) || 10;
        const subject = args.subject || 'Mathematics';
        const topics = curriculumService.getTopicsForSubject(grade, subject);

        return {
            subject,
            grade,
            curriculumStandard: 'CAPS (Curriculum and Assessment Policy Statement)',
            topicsCount: topics.length,
            topics: topics.slice(0, 15)
        };
    },

    async get_teacher_classes(args, context) {
        const teacherUserId = context.user.id;
        const res = await db.query(
            `SELECT c.id, c.name, c.grade, c.stream, 
                    (SELECT COUNT(*)::int FROM children WHERE class_id = c.id) as learner_count
             FROM classes c
             WHERE c.homeroom_teacher_id = $1 OR c.assigned_teacher_id = $1
             ORDER BY c.name ASC`,
            [teacherUserId]
        );

        return {
            assignedClassesCount: res.rows.length,
            classes: res.rows.map(r => ({
                classId: r.id,
                className: r.name,
                grade: r.grade,
                stream: r.stream,
                learnerCount: r.learner_count
            }))
        };
    },

    async get_school_overview_stats(args, context) {
        const schoolId = context.user.school_id || 1;
        const [learnersRes, staffRes] = await Promise.all([
            db.query(`SELECT COUNT(*)::int as count FROM children WHERE school_id = $1`, [schoolId]),
            db.query(`SELECT COUNT(*)::int as count FROM users WHERE school_id = $1 AND role_id = (SELECT id FROM roles WHERE name = 'teacher')`, [schoolId])
        ]);

        return {
            schoolId,
            enrolledLearners: learnersRes.rows[0]?.count || 0,
            academicStaff: staffRes.rows[0]?.count || 0,
            platformStatus: 'Operational'
        };
    },

    async search_school_knowledge(args, context) {
        const ragService = require('./ragService');
        const schoolId = context.user?.school_id || null;
        const results = await ragService.searchKnowledge({
            query: args.query,
            schoolId,
            subject: args.subject || null,
            grade: args.grade || null,
            limit: 4
        });

        if (results.length === 0) {
            return {
                query: args.query,
                message: 'No specific approved school documents or curriculum items found matching this query. General guidance should be provided with appropriate acknowledgement.'
            };
        }

        return {
            query: args.query,
            foundCount: results.length,
            sources: results.map(r => ({
                sourceCitation: r.citation,
                title: r.title,
                topic: r.topic,
                content: r.fullContent
            }))
        };
    }
};

/**
 * Returns tool declarations authorized for a specific role
 */
function getToolsForRole(role) {
    const userRole = (role || 'visitor').toLowerCase();
    return TOOL_DEFINITIONS
        .filter(tool => tool.allowedRoles.includes(userRole))
        .map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }));
}

/**
 * Executes a tool securely with role and tenant validation
 */
async function executeTool(toolName, args, context) {
    const toolDef = TOOL_DEFINITIONS.find(t => t.name === toolName);
    if (!toolDef) {
        throw new Error(`Tool '${toolName}' does not exist.`);
    }

    const userRole = (context.user?.role || 'visitor').toLowerCase();
    if (!toolDef.allowedRoles.includes(userRole) && userRole !== 'admin' && userRole !== 'superadmin') {
        throw new Error(`Access Denied: Role '${userRole}' is not authorized to execute tool '${toolName}'.`);
    }

    const handler = TOOL_HANDLERS[toolName];
    if (!handler) {
        throw new Error(`No execution handler implemented for tool '${toolName}'.`);
    }

    return await handler(args, context);
}

module.exports = {
    getToolsForRole,
    executeTool,
    TOOL_DEFINITIONS
};
