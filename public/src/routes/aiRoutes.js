const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../../../db/db');
const gelezaOrchestrator = require('../services/ai/gelezaOrchestrator');
const aiProvider = require('../services/ai/aiProvider');
const specializedModules = require('../services/ai/specializedModules');
const gelezaAutomationService = require('../services/ai/gelezaAutomationService');
const gelezaAutomationJob = require('../services/ai/gelezaAutomationJob');
const ragService = require('../services/ai/ragService');

// Auth middleware: extracts authenticated user or gracefully falls back to visitor
const resolveAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const bearer = authHeader && authHeader.split(' ')[1];
    
    // Check cookie fallback if no bearer
    let token = bearer;
    if (!token && req.headers.cookie) {
        for (const part of req.headers.cookie.split(';')) {
            const [k, v] = part.split('=').map(s => s.trim());
            if (k === 'geleza_session') token = decodeURIComponent(v);
        }
    }

    if (!token || token === 'null' || token === 'undefined') {
        req.user = { id: null, role: 'visitor', full_name: 'Visitor' };
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err || !user) {
            req.user = { id: null, role: 'visitor', full_name: 'Visitor' };
        } else {
            req.user = user;
        }
        next();
    });
};

/**
 * POST /api/ai/chat
 * Primary Geleza AI conversational endpoint
 */
router.post('/chat', resolveAuth, async (req, res) => {
    try {
        const { message, conversationId, role, contextData } = req.body;
        if (!message || !String(message).trim()) {
            return res.status(400).json({ error: 'Please provide a message or prompt.' });
        }

        const user = req.user;
        const effectiveRole = role || user.role || 'learner';

        // Lookup school name if user is attached to a school
        let schoolName = 'Geleza SA';
        if (user.school_id) {
            try {
                const sRes = await db.query('SELECT name FROM schools WHERE id = $1', [user.school_id]);
                if (sRes.rows.length > 0) schoolName = sRes.rows[0].name;
            } catch (_) {}
        }

        const result = await gelezaOrchestrator.processChat({
            user,
            role: effectiveRole,
            message: String(message).trim(),
            conversationId: conversationId ? parseInt(conversationId, 10) : null,
            schoolName,
            contextData: contextData || {}
        });

        res.json({
            success: true,
            ...result
        });
    } catch (err) {
        console.error('[GELEZA AI ERROR] /api/ai/chat:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'An error occurred while generating AI response.'
        });
    }
});

/**
 * POST /api/ai/stream
 * Real-time Server-Sent Events (SSE) token streaming endpoint
 */
router.post('/stream', resolveAuth, async (req, res) => {
    const { message, history } = req.body;
    if (!message || !String(message).trim()) {
        return res.status(400).json({ error: 'Please provide a message to stream.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx proxy buffering

    try {
        const user = req.user;
        const effectiveRole = user.role || 'learner';
        const systemPrompt = `You are Geleza AI, the official intelligent educational assistant for Geleza SA. User role: ${effectiveRole}. Format in clear Markdown.`;

        const streamResult = await aiProvider.generateContentStream({
            systemInstruction: systemPrompt,
            prompt: String(message).trim(),
            history: history || []
        });

        for await (const chunk of streamResult.stream) {
            const chunkText = chunk.text();
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err) {
        console.error('[GELEZA AI STREAM ERROR]:', err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
});

/**
 * GET /api/ai/conversations
 * Retrieve recent conversations for the authenticated user
 */
router.get('/conversations', resolveAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.json({ conversations: [] });
        }
        const conversations = await gelezaOrchestrator.getUserConversations(userId, req.user.role);
        res.json({
            success: true,
            count: conversations.length,
            conversations
        });
    } catch (err) {
        console.error('[GELEZA AI ERROR] /conversations:', err);
        res.status(500).json({ error: 'Failed to retrieve conversation history.' });
    }
});

/**
 * GET /api/ai/conversations/:id
 * Retrieve messages for a specific conversation
 */
router.get('/conversations/:id', resolveAuth, async (req, res) => {
    try {
        const convId = parseInt(req.params.id, 10);
        const userId = req.user?.id;
        if (!convId) {
            return res.status(400).json({ error: 'Invalid conversation ID.' });
        }

        const data = await gelezaOrchestrator.getConversationMessages(convId, userId);
        if (!data) {
            return res.status(404).json({ error: 'Conversation not found.' });
        }

        res.json({
            success: true,
            ...data
        });
    } catch (err) {
        console.error('[GELEZA AI ERROR] /conversations/:id:', err);
        res.status(err.message.includes('Access denied') ? 403 : 500).json({ error: err.message });
    }
});

/**
 * DELETE /api/ai/conversations/:id
 * Remove a conversation session
 */
router.delete('/conversations/:id', resolveAuth, async (req, res) => {
    try {
        const convId = parseInt(req.params.id, 10);
        const userId = req.user?.id;
        if (!convId || !userId) {
            return res.status(400).json({ error: 'Invalid request.' });
        }

        const deleted = await gelezaOrchestrator.deleteConversation(convId, userId);
        if (!deleted) {
            return res.status(404).json({ error: 'Conversation not found or already deleted.' });
        }

        res.json({ success: true, message: 'Conversation deleted successfully.' });
    } catch (err) {
        console.error('[GELEZA AI ERROR] DELETE conversation:', err);
        res.status(500).json({ error: 'Failed to delete conversation.' });
    }
});

/**
 * POST /api/ai/feedback
 * Submit user rating and feedback on an AI message
 */
router.post('/feedback', resolveAuth, async (req, res) => {
    try {
        const { messageId, rating, feedbackText } = req.body;
        const cleanMessageId = typeof messageId === 'string' && messageId.startsWith('msg-') 
            ? parseInt(messageId.replace('msg-', ''), 10) 
            : parseInt(messageId, 10);

        if (!cleanMessageId || !['up', 'down'].includes(rating)) {
            return res.status(400).json({ error: 'Invalid feedback parameters.' });
        }

        await db.query(
            `INSERT INTO geleza_ai_feedback (message_id, user_id, rating, feedback_text)
             VALUES ($1, $2, $3, $4)`,
            [cleanMessageId, req.user?.id || null, rating, feedbackText || null]
        );

        res.json({ success: true, message: 'Feedback recorded. Thank you!' });
    } catch (err) {
        console.error('[GELEZA AI ERROR] feedback:', err);
        res.status(500).json({ error: 'Failed to submit feedback.' });
    }
});

/**
 * GET /api/ai/knowledge/search
 * Search approved CAPS curriculum and school policies
 */
router.get('/knowledge/search', resolveAuth, async (req, res) => {
    try {
        const { query, subject, grade } = req.query;
        const schoolId = req.user?.school_id || null;
        const results = await ragService.searchKnowledge({
            query: query || '',
            schoolId,
            subject: subject || null,
            grade: grade ? parseInt(grade, 10) : null
        });
        res.json({ success: true, resultsCount: results.length, results });
    } catch (err) {
        res.status(500).json({ error: 'Search failed.' });
    }
});

/**
 * POST /api/ai/tutor/quiz
 * Generate structured practice questions with hints and step-by-step solutions
 */
router.post('/tutor/quiz', resolveAuth, async (req, res) => {
    try {
        const { subject, grade, topic, questionCount, difficulty } = req.body;
        const quiz = await specializedModules.generateTutorQuiz({
            subject: subject || 'Mathematics',
            grade: grade || 10,
            topic: topic || 'General Topic',
            questionCount: questionCount || 3,
            difficulty: difficulty || 'medium'
        });
        res.json({ success: true, quiz });
    } catch (err) {
        console.error('[GELEZA TUTOR ERROR] quiz:', err);
        res.status(500).json({ error: 'Failed to generate tutor quiz.' });
    }
});

/**
 * POST /api/ai/tutor/explain-mistake
 * Constructive explanation of student error
 */
router.post('/tutor/explain-mistake', resolveAuth, async (req, res) => {
    try {
        const { subject, grade, question, studentAnswer, correctAnswer } = req.body;
        const result = await specializedModules.explainStudentMistake({
            subject: subject || 'Mathematics',
            grade: grade || 10,
            question,
            studentAnswer,
            correctAnswer
        });
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to explain mistake.' });
    }
});

/**
 * POST /api/ai/teacher/lesson-plan
 * Draft an official CAPS lesson plan
 */
router.post('/teacher/lesson-plan', resolveAuth, async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'teacher' && role !== 'admin' && role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden: Requires educator or administrator role.' });
        }
        const { subject, grade, topic, term, durationMinutes } = req.body;
        const result = await specializedModules.generateLessonPlan({
            subject: subject || 'Mathematics',
            grade: grade || 10,
            topic: topic || 'Core Topic',
            term: term || 1,
            durationMinutes: durationMinutes || 60
        });
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate lesson plan.' });
    }
});

/**
 * POST /api/ai/teacher/assessment
 * Generate official test paper with Bloom's taxonomy balance and marking memo
 */
router.post('/teacher/assessment', resolveAuth, async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'teacher' && role !== 'admin' && role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden: Requires educator or administrator role.' });
        }
        const { subject, grade, topic, totalMarks } = req.body;
        const result = await specializedModules.generateAssessmentPaper({
            subject: subject || 'Mathematics',
            grade: grade || 10,
            topic: topic || 'Core Topic',
            totalMarks: totalMarks || 30
        });
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate assessment paper.' });
    }
});

/**
 * POST /api/ai/parent/draft-message
 * Draft a polite parent-teacher communication
 */
router.post('/parent/draft-message', resolveAuth, async (req, res) => {
    try {
        const { childName, teacherName, topic, messageObjective } = req.body;
        const parentName = req.user?.full_name || 'Parent';
        const result = await specializedModules.draftTeacherMessage({
            parentName,
            childName: childName || 'My Child',
            teacherName: teacherName || 'Teacher',
            topic: topic || 'Academic Progress',
            messageObjective: messageObjective || 'Discuss progress and support needs'
        });
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to draft teacher message.' });
    }
});

/**
 * GET /api/ai/insight/class/:classId
 * Deterministic class performance analytics
 */
router.get('/insight/class/:classId', resolveAuth, async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'teacher' && role !== 'admin' && role !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden: Requires educator or administrator role.' });
        }
        const classId = parseInt(req.params.classId, 10);
        const stats = await specializedModules.getClassAnalytics({ classId });
        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to compute class analytics.' });
    }
});

/**
 * POST /api/ai/automation/run
 * On-demand execution of Geleza AI workflows (Admin/Teacher only)
 */
router.post('/automation/run', resolveAuth, async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'principal' && role !== 'superadmin' && role !== 'teacher') {
            return res.status(403).json({ error: 'Forbidden: Requires educator or administrator role.' });
        }

        const { workflow = 'all', dryRun = false, force = false, schoolId, dueWithinHours, lookaheadDays } = req.body;
        const targetSchoolId = schoolId || req.user?.school_id || null;

        let result;
        if (workflow === 'assignments') {
            result = await gelezaAutomationService.runAssignmentDeadlineReminders({
                schoolId: targetSchoolId,
                dueWithinHours: dueWithinHours || 48,
                force,
                dryRun
            });
        } else if (workflow === 'attendance') {
            result = await gelezaAutomationService.runAttendanceAlerts({
                schoolId: targetSchoolId,
                force,
                dryRun
            });
        } else if (workflow === 'exams') {
            result = await gelezaAutomationService.runUpcomingExamBriefings({
                schoolId: targetSchoolId,
                lookaheadDays: lookaheadDays || 7,
                force,
                dryRun
            });
        } else {
            result = await gelezaAutomationJob.runCycle({
                schoolId: targetSchoolId,
                dryRun,
                force,
                triggeredBy: `user_${req.user?.id || 'admin'}`
            });
        }

        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[GELEZA AUTOMATION ROUTE ERROR]:', err);
        res.status(500).json({ error: 'Failed to run automation workflow.' });
    }
});

/**
 * GET /api/ai/automation/status
 * Returns background automation runner status and execution history
 */
router.get('/automation/status', resolveAuth, async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'principal' && role !== 'superadmin' && role !== 'teacher') {
            return res.status(403).json({ error: 'Forbidden: Requires educator or administrator role.' });
        }
        res.json({ success: true, ...gelezaAutomationJob.getJobStatus() });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve automation status.' });
    }
});

/**
 * GET /api/ai/automation/logs
 * Retrieves historical automation dispatch records
 */
router.get('/automation/logs', resolveAuth, async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'principal' && role !== 'superadmin' && role !== 'teacher') {
            return res.status(403).json({ error: 'Forbidden: Requires educator or administrator role.' });
        }
        const { jobType, limit } = req.query;
        const schoolId = req.user?.school_id || null;
        const logs = await gelezaAutomationService.getRecentLogs({
            schoolId,
            jobType: jobType || null,
            limit: limit ? parseInt(limit, 10) : 50
        });
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve automation logs.' });
    }
});

/**
 * GET /api/ai/automation/briefing/class/:classId
 * Generates an educator briefing synthesizing class risk factors
 */
router.get('/automation/briefing/class/:classId', resolveAuth, async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'principal' && role !== 'superadmin' && role !== 'teacher') {
            return res.status(403).json({ error: 'Forbidden: Requires educator or administrator role.' });
        }
        const classId = parseInt(req.params.classId, 10);
        const briefing = await gelezaAutomationService.synthesizeClassRiskBriefing({ classId });
        res.json({ success: true, briefing });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to synthesize class risk briefing.' });
    }
});

module.exports = router;

