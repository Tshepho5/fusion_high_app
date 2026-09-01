const db = require('../../../db/db');
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
        let schoolId = 1;

        if (childRes.rows.length > 0) {
            const child = childRes.rows[0];
            grade = child.grade || 10;
            stream = child.stream || 'Science';
            customSubjects = child.subjects;
            schoolId = child.school_id || 1;
        } else {
            // Fallback: check users table
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
        let schoolName = 'Fusion High School';
        try {
            const sRes = await db.query('SELECT name FROM schools WHERE id = $1', [schoolId]);
            if (sRes.rows.length > 0) schoolName = sRes.rows[0].name;
        } catch (_) {}

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
 * Interactive Chat with Gemini AI Subject Tutor.
 */
exports.sendChatMessage = async (req, res) => {
    try {
        const learnerUserId = req.user.id;
        const { subject, grade, stream, topic, message, conversationId, language } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Please provide a message or question.' });
        }

        // Fetch school name
        let schoolName = 'Fusion High School';
        try {
            const userRes = await db.query('SELECT s.name FROM users u JOIN schools s ON u.school_id = s.id WHERE u.id = $1', [learnerUserId]);
            if (userRes.rows.length > 0 && userRes.rows[0].name) {
                schoolName = userRes.rows[0].name;
            }
        } catch (_) {}

        const tutorResponse = await aiTutorService.chatWithSubjectTutor({
            learnerUserId,
            subject: subject || 'General',
            grade: grade || 10,
            stream: stream || 'General',
            topic: topic || null,
            message: message.trim(),
            conversationId: conversationId ? parseInt(conversationId, 10) : null,
            language: language || 'english',
            schoolName
        });

        res.json(tutorResponse);
    } catch (err) {
        console.error('[AI TUTOR CONTROLLER ERROR] sendChatMessage:', err);
        res.status(500).json({ error: err.message || 'Failed to generate tutor response.' });
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
