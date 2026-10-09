const db = require('../../../db/db');
const { resolveSchoolId } = require('../services/schoolScope');
const aiTutorService = require('../services/aiTutorService');
const curriculumService = require('../services/curriculumService');

/**
 * Retrieves the learner's enrolled subjects with Grade & Stream specific CAPS syllabus topics.
 */
exports.getEnrolledSubjectsWithSyllabus = async (req, res) => {
    try {
        const learnerUserId = req.user.id;

        // Fetch learner profile from children table
        let childRes = await db.query(
            `SELECT id, grade, stream, subjects, full_name, surname, learner_number, school_id 
             FROM children 
             WHERE learner_user_id = $1`,
            [learnerUserId]
        );

        let grade = 10;
        let stream = 'Science';
        let customSubjects = null;
        let schoolId = null;

        if (childRes.rows.length > 0) {
            const child = childRes.rows[0];
            grade = child.grade || 10;
            stream = child.stream || 'Science';
            customSubjects = child.subjects;
            schoolId = child.school_id || null;
        } else {
            const userRes = await db.query('SELECT school_id FROM users WHERE id = $1', [learnerUserId]);
            if (userRes.rows.length > 0 && userRes.rows[0].school_id) {
                schoolId = userRes.rows[0].school_id;
            }
        }

        // Resolve enrolled subject list
        let subjectsList = [];
        if (customSubjects && Array.isArray(customSubjects) && customSubjects.length > 0) {
            subjectsList = customSubjects;
        } else {
            subjectsList = curriculumService.getSubjectsForGradeAndStream(grade, stream);
        }

        // Attach syllabus topics for each subject
        const subjectsWithSyllabus = subjectsList.map(subjName => {
            const topics = aiTutorService.getCurriculumTopics(grade, stream, subjName);
            return {
                name: subjName,
                normalized: aiTutorService.normalizeSubject(subjName),
                topicsCount: topics.length,
                topics: topics.map(t => ({ id: t.id, topic: t.topic, grade: t.grade, stream: t.stream }))
            };
        });

        // Fetch school name
        let schoolName = 'Geleza SA';
        if (schoolId) {
            try {
                const sRes = await db.query('SELECT name FROM schools WHERE id = $1', [schoolId]);
                if (sRes.rows.length > 0) schoolName = sRes.rows[0].name;
            } catch (_) {}
        }

        res.json({
            grade,
            stream,
            schoolName,
            totalSubjects: subjectsWithSyllabus.length,
            subjects: subjectsWithSyllabus
        });
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] getEnrolledSubjectsWithSyllabus:', err);
        res.status(500).json({ error: 'Failed to retrieve enrolled subjects and curriculum topics.' });
    }
};

/**
 * Retrieves all saved conversation threads for a subject.
 */
exports.getConversations = async (req, res) => {
    try {
        const learnerUserId = req.user.id;
        const subject = req.query.subject || '';

        const conversations = await aiTutorService.getLearnerConversations(learnerUserId, subject);
        res.json({
            subject,
            count: conversations.length,
            conversations
        });
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] getConversations:', err);
        res.status(500).json({ error: 'Failed to retrieve saved conversations.' });
    }
};

/**
 * Retrieves full message history of a specific conversation session.
 */
exports.getConversationDetails = async (req, res) => {
    try {
        const learnerUserId = req.user.id;
        const conversationId = parseInt(req.params.id, 10);

        if (!conversationId) {
            return res.status(400).json({ error: 'Invalid conversation ID.' });
        }

        const details = await aiTutorService.getConversationDetails(conversationId, learnerUserId);
        if (!details) {
            return res.status(404).json({ error: 'Conversation session not found.' });
        }

        res.json(details);
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] getConversationDetails:', err);
        res.status(500).json({ error: 'Failed to retrieve conversation details.' });
    }
};

/**
 * Starts a new subject consultation conversation session.
 */
exports.startNewConversation = async (req, res) => {
    try {
        const learnerUserId = req.user.id;
        const { subject, grade, stream, topic, title, language } = req.body;

        if (!subject) {
            return res.status(400).json({ error: 'Subject is required to start a consultation.' });
        }

        const session = await aiTutorService.startNewConversation(learnerUserId, {
            subject_name: subject,
            grade: grade || 10,
            stream: stream || 'General',
            topic: topic || 'General Subject Help',
            title: title || `Consultation: ${topic || subject}`,
            language: language || 'english'
        });

        res.json({
            message: 'New study session started successfully.',
            session
        });
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] startNewConversation:', err);
        res.status(500).json({ error: 'Failed to start new study session.' });
    }
};

/**
 * Interactive Chat with Gemini AI Subject & Portal Assistant.
 */
exports.sendChatMessage = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const {
            subject,
            grade,
            stream,
            topic,
            message,
            conversationId,
            language,
            role: reqRole,
            fullName,
            conversationHistory,
            previous_questions
        } = req.body;
        const userRole = (req.user && req.user.role) || reqRole || 'learner';

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Please provide a message or question.' });
        }

        // Fetch user & school name
        let schoolName = 'Geleza SA';
        let userDisplayName = fullName || (req.user && (req.user.full_name || req.user.name)) || '';
        if (userId) {
            try {
                const userRes = await db.query(
                    `SELECT u.full_name, s.name as school_name 
                     FROM users u 
                     LEFT JOIN schools s ON u.school_id = s.id 
                     WHERE u.id = $1`,
                    [userId]
                );
                if (userRes.rows.length > 0) {
                    if (userRes.rows[0].school_name) schoolName = userRes.rows[0].school_name;
                    if (!userDisplayName && userRes.rows[0].full_name) userDisplayName = userRes.rows[0].full_name;
                }
            } catch (_) {}
        }

        const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const startTime = Date.now();
        console.info(`[AI REQUEST RECV] id=${reqId} role=${userRole} subject=${subject || 'General'} grade=${grade || 10} msgLen=${message.length}`);

        const tutorResponse = await aiTutorService.chatWithSubjectTutor({
            learnerUserId: userId,
            role: userRole,
            fullName: userDisplayName,
            subject: subject || 'General School & Academics',
            grade: grade || 10,
            stream: stream || 'General',
            topic: topic || null,
            message: message.trim(),
            conversationId: conversationId ? parseInt(conversationId, 10) : null,
            conversationHistory: conversationHistory || [],
            previous_questions: previous_questions || [],
            language: language || 'english',
            schoolName
        });

        const durationMs = Date.now() - startTime;
        console.info(`[AI RESPONSE DELIVERED] id=${reqId} duration=${durationMs}ms replyLen=${tutorResponse?.reply ? tutorResponse.reply.length : 0} suggestions=${tutorResponse?.suggestions ? tutorResponse.suggestions.length : 0}`);

        res.json({
            ...tutorResponse,
            requestId: reqId,
            durationMs
        });
    } catch (err) {
        console.error(`[AI REQUEST FAILED] error=${err.message} code=${err.code || 'UNKNOWN'}`);
        res.status(500).json({
            error: err.message || 'Failed to generate tutor response.',
            providerError: Boolean(err.isProviderFailure || err.code === 'CONFIG_MISSING' || (err.message && (err.message.includes('429') || err.message.includes('Quota')))),
            reply: `⚠️ **Geleza AI Connection Notice**\n\nThe AI model provider is currently experiencing temporary rate limits or connectivity issues (${err.message || 'Service unavailable'}). Please try again in a few moments, or choose one of your study guide topics below.`,
            suggestions: [
                'Give me a Grade 10 Life Sciences practice question',
                'Explain cell structure and organelles',
                'Show me exam study tips for Life Sciences'
            ]
        });
    }
};

/**
 * Deletes a conversation session.
 */
exports.deleteConversation = async (req, res) => {
    try {
        const learnerUserId = req.user.id;
        const conversationId = parseInt(req.params.id, 10);

        if (!conversationId) {
            return res.status(400).json({ error: 'Invalid conversation ID.' });
        }

        const deleted = await aiTutorService.deleteConversation(conversationId, learnerUserId);
        if (!deleted) {
            return res.status(404).json({ error: 'Conversation session not found or already removed.' });
        }

        res.json({ success: true, message: 'Conversation session removed successfully.' });
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] deleteConversation:', err);
        res.status(500).json({ error: 'Failed to remove conversation session.' });
    }
};

/**
 * Retrieves the dedicated Grade 12 Life Sciences CAPS topic database.
 */
exports.getLifeSciencesTopics = async (req, res) => {
    try {
        const kb = aiTutorService.getLifeSciencesKnowledgeBase();
        res.json({
            subject: 'Life Sciences',
            grade: 12,
            curriculum: 'DBE CAPS (National Senior Certificate)',
            totalTopics: kb.length,
            topics: kb
        });
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] getLifeSciencesTopics:', err);
        res.status(500).json({ error: 'Failed to load Life Sciences knowledge base.' });
    }
};

/**
 * Evaluates a learner's exam question response against the official DBE marking rubric.
 */
exports.evaluateLifeSciencesAnswer = async (req, res) => {
    try {
        const { itemId, studentAnswer } = req.body;
        if (!itemId || !studentAnswer) {
            return res.status(400).json({ error: 'Both itemId and studentAnswer are required.' });
        }

        const evaluation = aiTutorService.evaluateLifeSciencesAnswer(itemId, studentAnswer);
        res.json(evaluation);
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] evaluateLifeSciencesAnswer:', err);
        res.status(500).json({ error: 'Failed to evaluate Life Sciences answer.' });
    }
};

/**
 * Retrieves the dedicated Physical Sciences CAPS topic database (Supports Grade 10 and Grade 12).
 */
exports.getPhysicalSciencesTopics = async (req, res) => {
    try {
        const grade = parseInt(req.query.grade || '12', 10);
        if (grade === 10) {
            const kb = aiTutorService.getPhysicalSciencesGrade10KnowledgeBase();
            return res.json({
                subject: 'Physical Sciences',
                grade: 10,
                curriculum: 'DBE CAPS Grade 10',
                totalTopics: kb.length,
                topics: kb
            });
        }
        const kb = aiTutorService.getPhysicalSciencesKnowledgeBase();
        res.json({
            subject: 'Physical Sciences',
            grade: 12,
            curriculum: 'DBE CAPS (National Senior Certificate)',
            totalTopics: kb.length,
            topics: kb
        });
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] getPhysicalSciencesTopics:', err);
        res.status(500).json({ error: 'Failed to load Physical Sciences knowledge base.' });
    }
};

/**
 * Explicitly retrieves the dedicated Grade 10 Physical Sciences CAPS topic database.
 */
exports.getPhysicalSciencesGrade10Topics = async (req, res) => {
    try {
        const kb = aiTutorService.getPhysicalSciencesGrade10KnowledgeBase();
        res.json({
            subject: 'Physical Sciences',
            grade: 10,
            curriculum: 'DBE CAPS Grade 10',
            totalTopics: kb.length,
            topics: kb
        });
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] getPhysicalSciencesGrade10Topics:', err);
        res.status(500).json({ error: 'Failed to load Grade 10 Physical Sciences knowledge base.' });
    }
};

/**
 * Evaluates a learner's physics exam question response against the official DBE marking rubric.
 */
exports.evaluatePhysicalSciencesAnswer = async (req, res) => {
    try {
        const { itemId, studentAnswer } = req.body;
        if (!itemId || !studentAnswer) {
            return res.status(400).json({ error: 'Both itemId and studentAnswer are required.' });
        }

        const evaluation = aiTutorService.evaluatePhysicalSciencesAnswer(itemId, studentAnswer);
        res.json(evaluation);
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] evaluatePhysicalSciencesAnswer:', err);
        res.status(500).json({ error: 'Failed to evaluate Physical Sciences answer.' });
    }
};

/**
 * Retrieves the dedicated Grade 12 Mathematics CAPS topic database.
 */
exports.getMathematicsTopics = async (req, res) => {
    try {
        const kb = aiTutorService.getMathematicsKnowledgeBase();
        res.json({
            subject: 'Mathematics',
            grade: 12,
            curriculum: 'DBE CAPS (National Senior Certificate)',
            totalTopics: kb.length,
            topics: kb
        });
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] getMathematicsTopics:', err);
        res.status(500).json({ error: 'Failed to load Mathematics knowledge base.' });
    }
};

/**
 * Evaluates a learner's mathematics exam question response against the official DBE marking rubric.
 */
exports.evaluateMathematicsAnswer = async (req, res) => {
    try {
        const { itemId, studentAnswer } = req.body;
        if (!itemId || !studentAnswer) {
            return res.status(400).json({ error: 'Both itemId and studentAnswer are required.' });
        }

        const evaluation = aiTutorService.evaluateMathematicsAnswer(itemId, studentAnswer);
        res.json(evaluation);
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] evaluateMathematicsAnswer:', err);
        res.status(500).json({ error: 'Failed to evaluate Mathematics answer.' });
    }
};


