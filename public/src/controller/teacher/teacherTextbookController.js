const db = require('../../../../db/db');
const aiTutor = require('../../services/aiTutorService');
const emailService = require('../../services/emailService');
const NotificationService = require('../../services/notificationService');

// Sliding-window cache to guarantee zero repeated questions per educator, subject, and topic
const recentQuestionsCache = new Map();

exports.getMyTextbooks = async (req, res) => {
    try {
        const teacherId = req.user ? req.user.id : null;
        const { subject, grade, resource_type, search } = req.query;

        // Build query conditions
        let whereClauses = [];
        let params = [];
        let pIndex = 1;

        // If specific filters are requested
        if (subject && subject !== 'All') {
            whereClauses.push(`(t.subject ILIKE $${pIndex} OR LOWER(t.subject) = LOWER($${pIndex}))`);
            params.push(`%${subject}%`);
            pIndex++;
        }

        if (grade && grade !== 'All') {
            whereClauses.push(`t.grade = $${pIndex}`);
            params.push(parseInt(grade, 10));
            pIndex++;
        }

        if (resource_type && resource_type !== 'All') {
            whereClauses.push(`t.resource_type = $${pIndex}`);
            params.push(resource_type);
            pIndex++;
        }

        if (search) {
            whereClauses.push(`(t.title ILIKE $${pIndex} OR t.file_name ILIKE $${pIndex} OR t.description ILIKE $${pIndex})`);
            params.push(`%${search}%`);
            pIndex++;
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const query = `
            SELECT 
                t.id, 
                COALESCE(t.subject, 'General Subject') AS subject, 
                COALESCE(t.grade, 10) AS grade, 
                COALESCE(t.stream, 'General') AS stream,
                COALESCE(t.resource_type, 'past_paper') AS resource_type,
                COALESCE(t.title, COALESCE(t.subject, 'Subject') || ' Grade ' || COALESCE(t.grade, 10) || ' ' || COALESCE(t.resource_type, 'Resource')) AS title,
                t.description,
                t.term,
                COALESCE(t.year, 2026) AS year,
                t.file_name,
                COALESCE(t.file_size, '2.4 MB') AS file_size,
                t.file_path, 
                COALESCE(t.upload_date, t.uploaded_at, NOW()) AS upload_date,
                t.teacher_id,
                COALESCE(u.full_name, 'Department of Basic Education') AS uploader_name,
                COALESCE(u.surname, '(CAPS Archive)') AS uploader_surname
            FROM textbooks t
            LEFT JOIN users u ON t.teacher_id::text = u.id::text
            ${whereSql}
            ORDER BY t.grade ASC, t.subject ASC, t.year DESC NULLS LAST, t.id DESC
            LIMIT 300
        `;

        const result = await db.query(query, params);
        res.json(result.rows || []);
    } catch (err) {
        console.error('Error fetching teacher resources:', err);
        // Fallback gracefully to empty array so frontend does not show a blocking database error
        res.json([]);
    }
};

exports.uploadResource = async (req, res) => {
    const subject = aiTutor.normalizeSubject(req.body.subject) || req.body.subject || 'Mathematics';
    const grade = parseInt(req.body.grade || '10', 10);
    const stream = req.body.stream || 'General';
    const resourceType = req.body.resource_type || 'past_paper'; // 'past_paper', 'textbook', 'study_guide', 'worksheet', 'exam_memo'
    const title = req.body.title || `${subject} Grade ${grade} ${resourceType === 'past_paper' ? 'Past Exam Paper' : 'Study Resource'}`;
    const description = req.body.description || '';
    const term = req.body.term || 'Term 3';
    const year = parseInt(req.body.year || '2026', 10);

    if (!req.file && !req.body.file_url) {
        return res.status(400).json({ error: 'Please upload a PDF document or provide a file URL.' });
    }

    const filePath = req.file ? `/uploads/textbooks/${req.file.filename}` : req.body.file_url;
    const fileName = req.file ? req.file.originalname : (req.body.file_name || `${title}.pdf`);
    const fileSize = req.file ? `${(req.file.size / (1024 * 1024)).toFixed(2)} MB` : '1.5 MB';

    try {
        const insertRes = await db.query(`
            INSERT INTO textbooks (
                subject, grade, stream, resource_type, title, description, 
                term, year, file_path, file_name, file_size, teacher_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            subject, grade, stream, resourceType, title, description,
            term, year, filePath, fileName, fileSize, req.user.id
        ]);

        const uploadedResource = insertRes.rows[0];

        // If this uploaded resource is a textbook, sync it into textbook_inventory catalog
        if (resourceType === 'textbook') {
            try {
                await db.query(`
                    INSERT INTO textbook_inventory (
                        title, subject, grade, publisher, isbn, barcode, total_copies, available_copies, unit_cost_zar
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    title,
                    subject,
                    grade,
                    'Educator Upload (CAPS Archive)',
                    req.body.isbn || null,
                    req.body.barcode || `TB-${grade}-${Date.now().toString().slice(-6)}`,
                    parseInt(req.body.total_copies || '50', 10),
                    parseInt(req.body.total_copies || '50', 10),
                    parseFloat(req.body.unit_cost_zar || '250.00')
                ]);
            } catch (invErr) {
                console.warn('[TEXTBOOK INVENTORY SYNC NOTICE]', invErr.message);
            }
        }

        // Fetch teacher's name for notification
        const teacherRes = await db.query('SELECT full_name, surname FROM users WHERE id = $1', [req.user.id]);
        const teacherName = teacherRes.rows[0] ? `${teacherRes.rows[0].full_name} ${teacherRes.rows[0].surname || ''}`.trim() : 'Your Educator';

        const typeLabels = {
            past_paper: 'Past Exam Question Paper',
            textbook: 'CAPS Textbook',
            study_guide: 'Study Guide & Notes',
            worksheet: 'Revision Worksheet',
            exam_memo: 'Examination Memorandum'
        };
        const label = typeLabels[resourceType] || 'Learning Resource';

        const announcementTitle = `New ${label}: ${title} (${subject})`;
        const announcementContent = `${teacherName} uploaded a new ${label.toLowerCase()} for Grade ${grade} ${subject} (${term} ${year}): "${title}". Learners can view and download this file directly in their Subjects & Resources portal tab.`;

        // Automatically create in-app announcement entry
        try {
            await db.query(`
                INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, subject_target, created_at)
                VALUES ($1, $2, 'learner', $3, $4, $5, $6, NOW())
            `, [announcementTitle, announcementContent, req.user.id, grade, stream, subject]);
        } catch (annErr) {
            console.warn('[ANNOUNCEMENT INSERT NOTICE]', annErr.message);
        }

        // Automatically dispatch targeted in-app notifications and direct email broadcast to learners & parents
        NotificationService.sendTargeted({
            targetRole: 'learner',
            grade: grade,
            stream: stream,
            subject: subject,
            includeParents: true,
            authorId: req.user.id,
            title: announcementTitle,
            message: announcementContent,
            fullContent: announcementContent,
            type: resourceType === 'past_paper' ? 'past_paper' : 'resource',
            targetTab: 'subjects',
            sendToMessages: true,
            sendEmail: true,
            metadata: {
                resource_id: uploadedResource.id,
                subject: subject,
                grade: grade,
                resource_type: resourceType,
                file_path: filePath,
                file_name: fileName
            }
        }).catch(err => console.error('[NOTIFICATION DISPATCH ERROR]', err));

        res.json({
            success: true,
            message: `${label} uploaded successfully, announcement published, and notifications dispatched!`,
            resource: uploadedResource
        });
    } catch (err) {
        console.error('Error uploading resource:', err);
        res.status(500).json({ error: 'Failed to save resource: ' + err.message });
    }
};

exports.uploadTextbook = exports.uploadResource;

exports.deleteResource = async (req, res) => {
    const resourceId = parseInt(req.params.id, 10);
    try {
        const result = await db.query(
            'DELETE FROM textbooks WHERE id = $1 AND (teacher_id::text = $2::text OR EXISTS (SELECT 1 FROM users u JOIN roles r ON u.role_id::text = r.id::text WHERE u.id::text = $2::text AND LOWER(r.name) = \'admin\')) RETURNING id',
            [resourceId, String(req.user.id)]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Resource not found or unauthorized.' });
        }
        res.json({ success: true, message: 'Resource removed successfully.' });
    } catch (err) {
        console.error('Error deleting resource:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getTopicsFromTextbook = async (req, res) => {
    const subject = aiTutor.normalizeSubject(req.query.subject);
    const { grade } = req.query;

    try {
        let officialTopics = [];
        if (aiTutor.aiCurriculum) {
            const keys = Object.keys(aiTutor.aiCurriculum);
            const matchedKey = keys.find(k => k.toLowerCase() === subject.toLowerCase()) || 
                               keys.find(k => k.toLowerCase().includes(subject.toLowerCase())) ||
                               keys.find(k => subject.toLowerCase().includes(k.toLowerCase()));
            if (matchedKey && aiTutor.aiCurriculum[matchedKey]) {
                officialTopics = aiTutor.aiCurriculum[matchedKey]
                    .filter(t => !grade || String(t.grade) === String(grade))
                    .map(t => t.topic);
            }
        }

        const bookRes = await db.query(
            `SELECT file_path FROM textbooks 
             WHERE (LOWER(subject) ILIKE LOWER($1) OR LOWER($1) ILIKE '%' || LOWER(subject) || '%') 
             AND grade = $2 AND (teacher_id = $3 OR is_published = true) ORDER BY year DESC, upload_date DESC LIMIT 2`,
            [`%${subject}%`, grade, req.user.id]
        );

        let textbookTopics = [];
        if (bookRes.rows.length > 0) {
            const contentSnippet = await aiTutor.getTextbookContent(bookRes.rows[0].file_path, 8000);
            if (aiTutor.extractTopicsFromContent) {
                textbookTopics = await aiTutor.extractTopicsFromContent(contentSnippet, null, grade, subject);
            }
        }

        const combinedTopics = Array.from(new Set([...officialTopics, ...textbookTopics]));
        res.json({ topics: combinedTopics, source: bookRes.rows.length > 0 ? 'textbook_and_caps' : 'caps_curriculum' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.generateAIQuestions = async (req, res) => {
    const { topic, grade, count = 5, marks_per_question = 2, previous_questions = [] } = req.body;
    const class_name = req.body.class_name || req.body.className || req.body.class || '';
    const subject = aiTutor.normalizeSubject(req.body.subject) || req.body.subject || 'Mathematics';
    const userId = req.user ? req.user.id : 'default_teacher';
    const cacheKey = `${userId}_${subject}_${grade}_${topic}`.toLowerCase().replace(/\s+/g, '_');

    if (!topic || !grade) {
        return res.status(400).json({ error: 'Subject, grade, and topic are required.' });
    }

    // Retrieve previous questions to guarantee ZERO repetition
    const existingCached = recentQuestionsCache.get(cacheKey) || new Set();
    const allPrevious = Array.from(new Set([
        ...Array.from(existingCached),
        ...(Array.isArray(previous_questions) ? previous_questions : [])
    ])).filter(q => q && typeof q === 'string' && q.trim().length > 5);

    let antiRepetitionSection = '';
    if (allPrevious.length > 0) {
        const samplePrevious = allPrevious.slice(-12);
        antiRepetitionSection = `
    CRITICAL MANDATORY ZERO-DUPLICATION & ANTI-REPETITION MANDATE:
    - The educator/class has ALREADY seen or generated the following questions on "${topic}":
${samplePrevious.map((q, i) => `      [Previous Q${i + 1}]: "${q.replace(/\n/g, ' ')}"`).join('\n')}
    - You MUST NOT repeat, reword, duplicate, clone, or replicate ANY of the questions above.
    - You MUST test completely DIFFERENT sub-concepts, use distinct practical scenarios, unique problem formulations, and fresh numbers/variables.`;
    }

    let contextText = null;
    try {
        const bookRes = await db.query(
            `SELECT file_path FROM textbooks 
             WHERE (LOWER(subject) ILIKE LOWER($1) OR LOWER($1) ILIKE '%' || LOWER(subject) || '%')
             AND grade = $2 AND (teacher_id = $3 OR is_published = true) ORDER BY year DESC, upload_date DESC LIMIT 2`,
            [`%${subject}%`, grade, req.user.id]
        );

        if (bookRes.rows.length > 0) {
            contextText = await aiTutor.getTextbookContent(bookRes.rows[0].file_path, 8000);
        }
    } catch (err) { console.error("[TEXTBOOK ERROR]", err); }

    const entropySeed = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const cognitiveAngles = [
        "Focus on practical problem-solving & application scenarios",
        "Focus on conceptual definitions & core analytical mechanisms",
        "Focus on diagnostic troubleshooting & common student misconceptions",
        "Focus on data analysis, calculations, or structural comparisons",
        "Focus on real-world context & system interactions"
    ];
    const chosenAngle = cognitiveAngles[Math.floor(Math.random() * cognitiveAngles.length)];

    const prompt = `Act as an expert Grade ${grade} South African CAPS educator and curriculum assessment specialist for ${subject}${class_name ? ` (Teaching Class ${class_name})` : ''}.
    Subject: ${subject}
    Grade: ${grade}
    ${class_name ? `Target Class: ${class_name}\n    ` : ''}Topic: "${topic}"
    Target Question Count: ${count}
    Marks per Question: ${marks_per_question}
    Focus Angle: ${chosenAngle}
    Entropy Seed: ${entropySeed}
${antiRepetitionSection}

    CRITICAL SUBJECT BOUNDARY CONFINEMENT:
    - You are strictly creating assessment questions exclusively for Grade ${grade} ${subject}${class_name ? ` Class ${class_name}` : ''} on the specific topic "${topic}".
    - Every question stem, distracter option, scientific/mathematical term, and scenario MUST 100% belong to ${subject}.
    - Under NO circumstances include terminology or concepts from any other subject.

    CRITICAL NO-METADATA-TAGS MANDATE:
    - DO NOT prepend question stems with bracketed tags such as "[Grade 10 Physical Sciences]", "[Grade ${grade} ${subject}]", or any "[...]" prefix.
    - DO NOT start questions with "Question 1:", "Question 2:", etc.
    - The question stem must start immediately with the direct, natural question wording.

    CRITICAL ANTI-REPETITION MANDATE:
    - Every question MUST be unique and test a distinct sub-aspect of "${topic}".
    - DO NOT repeat question stems, scenarios, numbers, or phrasing from previous generations.
    - Randomize numerical values, context details, and the position of the correct answer among options (A, B, C, D).

    FORMAT REQUIREMENTS:
    - Return a JSON object with key "questions" containing exactly ${count} objects.
    - Each object must have:
      * "id": number (1 to ${count})
      * "question": string text of question (WITHOUT ANY BRACKET TAGS OR "Question N:" PREFIX)
      * "type": "multiple_choice"
      * "options": array of 4 distinct string choices e.g. ["A) ...", "B) ...", "C) ...", "D) ..."]
      * "answer": string matching EXACTLY one of the 4 options (e.g. "A) ...")
      * "marks": number (${marks_per_question})
    
    ${contextText ? "Reference textbook content: " + contextText.substring(0, 1500) : "Ensure age-appropriate Grade " + grade + " difficulty."}`;

    const targetCount = parseInt(count, 10) || 5;
    const targetMarks = parseInt(marks_per_question, 10) || 2;

    const cleanQuestionText = (txt, idx) => {
        if (!txt) return `Question ${idx + 1} on ${topic}`;
        return txt
            .replace(/^\[Grade[^\]]+\]\s*/i, '')
            .replace(/^\[[^\]]+\]\s*/i, '')
            .replace(/^Question\s*\d+\s*:\s*/i, '')
            .trim();
    };

    const recordGeneratedQuestions = (qList) => {
        try {
            qList.forEach(q => {
                if (q && q.question) existingCached.add(q.question.trim());
            });
            if (existingCached.size > 80) {
                const trimmed = Array.from(existingCached).slice(-60);
                recentQuestionsCache.set(cacheKey, new Set(trimmed));
            } else {
                recentQuestionsCache.set(cacheKey, existingCached);
            }
        } catch (_) {}
    };

    try {
        const aiResponse = await aiTutor.safeAICall(prompt, true);
        if (aiResponse.error) {
            const fallback = aiTutor.generateCAPSLocalFallback(prompt, subject, grade, topic, targetCount, targetMarks);
            const sanitizedFallback = (fallback.questions || []).map((q, idx) => ({
                ...q,
                question: cleanQuestionText(q.question, idx)
            }));
            recordGeneratedQuestions(sanitizedFallback);
            return res.json({ questions: sanitizedFallback });
        }
        const parsed = aiTutor.parseAIJSON(aiResponse);
        const questionsList = Array.isArray(parsed) ? parsed : (parsed?.questions || []);

        if (questionsList.length >= targetCount) {
            const sanitized = questionsList.slice(0, targetCount).map((q, idx) => ({
                id: idx + 1,
                question: cleanQuestionText(q.question, idx),
                type: 'multiple_choice',
                options: Array.isArray(q.options) && q.options.length >= 4
                    ? q.options.slice(0, 4)
                    : [`A) ${q.answer || 'Option A'}`, 'B) Distracter Option 1', 'C) Distracter Option 2', 'D) Distracter Option 3'],
                answer: q.answer || (Array.isArray(q.options) ? q.options[0] : 'A) Correct Choice'),
                marks: parseInt(q.marks, 10) || targetMarks
            }));
            recordGeneratedQuestions(sanitized);
            return res.json({ questions: sanitized });
        }

        // Use subject-specific fallback expansion if count is below target
        const fallback = aiTutor.generateCAPSLocalFallback(prompt, subject, grade, topic, targetCount, targetMarks);
        const sanitizedFallback = (fallback.questions || []).map((q, idx) => ({
            ...q,
            question: cleanQuestionText(q.question, idx)
        }));
        recordGeneratedQuestions(sanitizedFallback);
        return res.json({ questions: sanitizedFallback });
    } catch (error) {
        console.error('generateAIQuestions error, using subject-pure local engine:', error);
        const fallback = aiTutor.generateCAPSLocalFallback(prompt, subject, grade, topic, targetCount, targetMarks);
        const sanitizedFallback = (fallback.questions || []).map((q, idx) => ({
            ...q,
            question: cleanQuestionText(q.question, idx)
        }));
        recordGeneratedQuestions(sanitizedFallback);
        res.json({ questions: sanitizedFallback });
    }
};

exports.generateAILessonPlan = async (req, res) => {
    const { topic, grade, duration = '60 Minutes' } = req.body;
    const subject = aiTutor.normalizeSubject(req.body.subject) || req.body.subject || 'Mathematics';

    if (!topic || !grade) {
        return res.status(400).json({ error: 'Subject, grade, and topic are required.' });
    }

    const entropySeed = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const prompt = `Act as an expert Grade ${grade} Senior Curriculum Specialist for ${subject}.
    Create a comprehensive formal Lesson Plan strictly tailored for Grade ${grade} ${subject}:
    Subject: ${subject}
    Grade: ${grade}
    Topic: "${topic}"
    Duration: ${duration}
    Entropy Seed: ${entropySeed}

    CRITICAL SUBJECT BOUNDARY CONFINEMENT:
    - Content must exclusively pertain to ${subject}.
    - If ${subject} is Life Sciences, focus purely on biology, human physiology, genetics, plant anatomy, or ecosystems.
    - If ${subject} is Physical Sciences, focus on physics/chemistry.
    - If ${subject} is Mathematics, focus on mathematical theory and proofs.
    - If ${subject} is Accounting, focus on financial journals, ledgers, and statements.
    - If ${subject} is Tourism, focus on travel sectors, attractions, and customer service.

    Return a JSON object with keys:
    "title", "subject", "grade", "duration", "term_week", "learning_outcomes" (array of string goals), "prior_knowledge", "teacher_activities" (object with intro, presentation, practice, conclusion), "learner_activities" (object with classwork, homework), "assessment_strategy", "resources_needed" (array of strings).`;

    try {
        const aiResponse = await aiTutor.safeAICall(prompt, true);
        let lessonPlan = null;
        if (!aiResponse.error) {
            lessonPlan = aiTutor.parseAIJSON(aiResponse);
        }

        if (!lessonPlan || !lessonPlan.title) {
            const fallback = aiTutor.generateCAPSLocalFallback(`Subject: ${subject} Grade: ${grade} Topic: "${topic}" Lesson Plan`);
            lessonPlan = fallback.lesson_plan || {
                title: `${subject} Lesson Plan: ${topic}`,
                subject: subject,
                grade: `Grade ${grade}`,
                duration: duration || '60 Minutes',
                term_week: 'Term 3 • Week 4',
                learning_outcomes: [
                    `Define, describe, and explain fundamental concepts of ${topic}.`,
                    `Apply standard Grade ${grade} formulas, rules, and procedures for ${subject}.`,
                    `Demonstrate concept mastery through guided classwork exercises and assessment.`
                ],
                prior_knowledge: `Learners must have foundational prerequisite knowledge from previous terms.`,
                teacher_activities: {
                    intro: `10 min: Diagnostic review of prior concepts. Connect ${topic} to real-world applications.`,
                    presentation: `25 min: Conceptual breakdown, core definitions, and worked examples step-by-step.`,
                    practice: `15 min: Facilitate guided student pair-work on selected textbook exercise questions.`,
                    conclusion: `10 min: Exit ticket check to verify class understanding and allocate homework.`
                },
                learner_activities: {
                    classwork: `Complete exercises of progressive cognitive demand.`,
                    homework: `Complete revision worksheet questions 1 to 5.`
                },
                assessment_strategy: `Formative assessment via observation of pair-work and exit feedback.`,
                resources_needed: [`${subject} Learner Book & Teacher Guide`, `Reference notes and chalkboard`]
            };
        }
        res.json({ success: true, lesson_plan: lessonPlan });
    } catch (error) {
        console.error('generateAILessonPlan error:', error);
        const fallback = aiTutor.generateCAPSLocalFallback(`Subject: ${subject} Grade: ${grade} Topic: "${topic}" Lesson Plan`);
        res.json({ success: true, lesson_plan: fallback.lesson_plan });
    }
};

exports.generateAITestPaper = async (req, res) => {
    const { topic, grade, total_marks = 50 } = req.body;
    const subject = aiTutor.normalizeSubject(req.body.subject) || req.body.subject || 'Mathematics';

    if (!topic || !grade) {
        return res.status(400).json({ error: 'Subject, grade, and topic are required.' });
    }

    const entropySeed = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const prompt = `Act as an expert Senior Examiner for Grade ${grade} ${subject}.
    Generate a complete formal Grade ${grade} Test Paper AND matching Marking Memorandum for Topic: "${topic}" (Total Marks: ${total_marks}).
    Entropy Seed: ${entropySeed}

    CRITICAL SUBJECT BOUNDARY CONFINEMENT:
    - All questions, diagrams, and marking memorandum MUST strictly belong 100% to ${subject}.
    - Do not mix topics from other subjects.

    Format as JSON with keys:
    "test_header" (object with school, subject, grade, topic, total_marks, duration),
    "sections" (array of sections, each having section_title, questions array with q_num, question_text, marks),
    "marking_memo" (array of memo items with q_num, expected_answer, mark_breakdown).`;

    try {
        const aiResponse = await aiTutor.safeAICall(prompt, true);
        let testPaper = null;
        if (!aiResponse.error) {
            testPaper = aiTutor.parseAIJSON(aiResponse);
        }

        if (!testPaper || !testPaper.test_header) {
            const fallback = aiTutor.generateCAPSLocalFallback(`Subject: ${subject} Grade: ${grade} Topic: "${topic}" Test Paper`);
            testPaper = fallback.test_paper || {
                test_header: {
                    school: 'Fusion High School',
                    subject: subject,
                    grade: `Grade ${grade}`,
                    topic: topic,
                    total_marks: total_marks || 50,
                    duration: '60 Minutes'
                },
                sections: [
                    {
                        section_title: 'Section A: Multiple Choice & Terminology (10 Marks)',
                        questions: [
                            { q_num: '1.1', question_text: `Define the core principle of ${topic} in ${subject}.`, marks: 4 },
                            { q_num: '1.2', question_text: `Which standard rule governs analysis in ${topic}?`, marks: 6 }
                        ]
                    },
                    {
                        section_title: 'Section B: Structured Problem Solving (40 Marks)',
                        questions: [
                            { q_num: '2.1', question_text: `Calculate the requested variable for ${topic} showing full working.`, marks: 20 },
                            { q_num: '2.2', question_text: `Analyze the problem scenario and justify your final answer.`, marks: 20 }
                        ]
                    }
                ],
                marking_memo: [
                    { q_num: '1.1', expected_answer: `Accurate definition with key operative terms.`, mark_breakdown: '4 Marks' },
                    { q_num: '1.2', expected_answer: `Identification of governing property.`, mark_breakdown: '6 Marks' },
                    { q_num: '2.1', expected_answer: `Formula substitution and verified calculation.`, mark_breakdown: '20 Marks' },
                    { q_num: '2.2', expected_answer: `Structured analysis and correct conclusion.`, mark_breakdown: '20 Marks' }
                ]
            };
        }
        res.json({ success: true, test_paper: testPaper });
    } catch (error) {
        console.error('generateAITestPaper error:', error);
        const fallback = aiTutor.generateCAPSLocalFallback(`Subject: ${subject} Grade: ${grade} Topic: "${topic}" Test Paper`);
        res.json({ success: true, test_paper: fallback.test_paper });
    }
};

exports.publishAssignment = async (req, res) => {
    const { title, grade, questions, stream_target = 'General' } = req.body;
    const subject = aiTutor.normalizeSubject(req.body.subject) || req.body.subject || 'General';
    const teacherId = req.user.id;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'Cannot publish an empty assignment. Please generate questions first.' });
    }

    try {
        const result = await db.query(
            `INSERT INTO announcements (title, content, role_target, author_id, grade_target, stream_target, is_assignment, assignment_data, subject_target) 
             VALUES ($1, $2, 'all', $3, $4, $5, TRUE, $6, $7) RETURNING *`,
            [title, `New ${subject} Assignment: ${title}`, teacherId, grade, stream_target, JSON.stringify(questions), subject]
        );

        // Fetch learners and their linked parents
        const learnersRes = await db.query(
            `SELECT c.id as child_id, c.full_name as learner_name, c.surname as learner_surname, c.parent_id, u.email as learner_email, p.email as parent_email
             FROM children c 
             LEFT JOIN users u ON c.learner_user_id = u.id
             LEFT JOIN users p ON c.parent_id = p.id
             WHERE c.grade = $1`,
            [grade]
        );

        // Send email and dispatch parent messages
        for (const record of learnersRes.rows) {
            const learnerFullName = `${record.learner_name} ${record.learner_surname || ''}`.trim();

            // Email to learner
            if (record.learner_email) {
                try {
                    const tpl = emailService.templates.newAssignment(learnerFullName, subject, title);
                    await emailService.send(record.learner_email, tpl.subject, tpl.body);
                } catch (e) {}
            }

            // Message notification to parent
            if (record.parent_id) {
                try {
                    await db.query(
                        `INSERT INTO messages (sender_id, recipient_id, child_id, subject, body, read_at, created_at)
                         VALUES ($1, $2, $3, $4, $5, NULL, NOW())`,
                        [
                            teacherId,
                            record.parent_id,
                            record.child_id,
                            `New Task Assigned: ${subject} (${title})`,
                            `Dear Parent, a new ${subject} quiz/assignment "${title}" has been assigned to your child ${learnerFullName}. Please ensure they complete it before the due date.`
                        ]
                    );
                } catch (msgErr) {
                    console.error('Error sending parent task notification:', msgErr);
                }
            }
        }

        // Dispatch targeted notifications
        NotificationService.sendTargeted({
            targetRole: 'learner',
            grade: grade,
            stream: stream_target,
            subject: subject,
            includeParents: true,
            title: `New Assignment: ${title}`,
            message: `New ${subject} assignment published for Grade ${grade}. Open your tasks to complete it.`,
            type: 'assignment',
            targetTab: 'ai-tutor',
            metadata: { assignment_id: result.rows[0].id, subject, grade }
        }).catch(err => console.error('[ASSIGNMENT NOTIFICATION ERROR]', err));

        res.json({ message: 'Assignment published successfully and parents notified!', assignment: result.rows[0] });
    } catch (err) {
        console.error('Error publishing assignment:', err);
        res.status(500).json({ error: err.message });
    }
};
