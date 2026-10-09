const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();

const toolRegistry = require('../public/src/services/ai/toolRegistry');
const aiProvider = require('../public/src/services/ai/aiProvider');
const gelezaOrchestrator = require('../public/src/services/ai/gelezaOrchestrator');
const db = require('../db/db');

describe('Geleza AI Intelligence Subsystem', () => {

    test('1. Role-Based Tool Access Control & Isolation', () => {
        const learnerTools = toolRegistry.getToolsForRole('learner').map(t => t.name);
        const parentTools = toolRegistry.getToolsForRole('parent').map(t => t.name);
        const teacherTools = toolRegistry.getToolsForRole('teacher').map(t => t.name);

        // Verify learner has student-specific tools
        assert.ok(learnerTools.includes('get_my_timetable'), 'Learner must have timetable tool');
        assert.ok(learnerTools.includes('get_my_assignments'), 'Learner must have assignments tool');
        assert.ok(learnerTools.includes('get_my_marks_summary'), 'Learner must have marks summary tool');
        assert.ok(!learnerTools.includes('get_child_academic_summary'), 'Learner MUST NOT have parent child summary tool');
        assert.ok(!learnerTools.includes('get_teacher_classes'), 'Learner MUST NOT have teacher class tool');

        // Verify parent has parent-specific tools
        assert.ok(parentTools.includes('get_parent_children'), 'Parent must have child listing tool');
        assert.ok(parentTools.includes('get_child_academic_summary'), 'Parent must have child summary tool');
        assert.ok(!parentTools.includes('get_my_timetable'), 'Parent MUST NOT have learner timetable tool');

        // Verify teacher has teacher-specific tools
        assert.ok(teacherTools.includes('get_teacher_classes'), 'Teacher must have teacher classes tool');
    });

    test('2. Strict Execution Permission Checks', async () => {
        // Attempting to execute a parent tool with a learner role must fail
        await assert.rejects(
            async () => {
                await toolRegistry.executeTool('get_child_academic_summary', { child_id: 1 }, {
                    user: { id: 9999, role: 'learner' }
                });
            },
            /Access Denied/i,
            'Learner role executing parent tool must throw Access Denied'
        );
    });

    test('3. Object-Level Access Control for Parent Data', async () => {
        // If a parent calls child summary for a child not linked to them, it returns Unauthorized error
        const result = await toolRegistry.executeTool('get_child_academic_summary', { child_id: 999999 }, {
            user: { id: 888888, role: 'parent' }
        });

        assert.ok(result.error, 'Unlinked child lookup must return an error');
        assert.match(result.error, /Unauthorized/i, 'Must explicitly state unauthorized access');
    });

    test('4. AI Provider Key & Availability', () => {
        assert.equal(aiProvider.isAvailable(), true, 'AI Provider must have valid GEMINI_API_KEY on server');
        assert.ok(aiProvider.getClient(), 'AI Client must initialize without error');
    });

    test('5. End-to-End Orchestrator Chat & Database Persistence', async () => {
        const testUser = {
            id: 1,
            full_name: 'Kgosi Test',
            role: 'learner',
            school_id: 1
        };

        const result = await gelezaOrchestrator.processChat({
            user: testUser,
            role: 'learner',
            message: 'Hello Geleza AI! How does acceleration work in Physics?',
            schoolName: 'Fusion High'
        });

        assert.ok(result.conversationId, 'Result must contain active conversation ID');
        assert.ok(result.reply, 'Result must contain AI reply text');
        assert.ok(result.reply.length > 20, 'Reply must be substantial');
        assert.ok(Array.isArray(result.suggestions), 'Result must contain suggested questions');

        // Verify conversation was saved in database
        const savedData = await gelezaOrchestrator.getConversationMessages(result.conversationId, testUser.id);
        assert.ok(savedData, 'Saved conversation must be retrievable from DB');
        assert.ok(savedData.messages.length >= 2, 'Must contain both user message and assistant reply');

        // Clean up test conversation
        await gelezaOrchestrator.deleteConversation(result.conversationId, testUser.id);
    });

    test('6. RAG Curriculum & Policy Knowledge Retrieval with Citations', async () => {
        const ragService = require('../public/src/services/ai/ragService');
        const results = await ragService.searchKnowledge({
            query: 'quadratic equation',
            subject: 'Mathematics',
            grade: 12,
            limit: 2
        });

        assert.ok(results.length > 0, 'RAG search must return matching CAPS curriculum items');
        assert.ok(results[0].citation, 'Result must contain source citation');
        assert.match(results[0].citation, /Source/i, 'Citation must contain source tag');
        assert.ok(results[0].snippet.includes('x'), 'Content must include quadratic equation details');
    });

    test('7. Multi-Tenant Knowledge Isolation', async () => {
        const ragService = require('../public/src/services/ai/ragService');

        // Ingest a private document for School 888
        const ingested = await ragService.ingestSchoolDocument({
            schoolId: 888,
            title: 'School 888 Private Staff Disciplinary Code',
            documentType: 'school_policy',
            textContent: 'Confidential Disciplinary Matrix for School 888 staff members only.'
        });

        assert.ok(ingested.documentId, 'Document must be successfully ingested');

        // Search from School 999 perspective (must NOT find School 888's private document)
        const school999Search = await ragService.searchKnowledge({
            query: 'Confidential Disciplinary Matrix staff',
            schoolId: 999
        });

        const leaked = school999Search.some(r => r.title.includes('School 888'));
        assert.equal(leaked, false, 'School 999 MUST NOT see School 888 private documents');

        // Search from School 888 perspective (MUST find its own document)
        const school888Search = await ragService.searchKnowledge({
            query: 'Confidential Disciplinary Matrix staff',
            schoolId: 888
        });

        const foundOwn = school888Search.some(r => r.title.includes('School 888'));
        assert.equal(foundOwn, true, 'School 888 must find its own private document');
    });

    test('8. Specialized Module: Geleza Tutor Practice Quiz', async () => {
        const specializedModules = require('../public/src/services/ai/specializedModules');
        const quiz = await specializedModules.generateTutorQuiz({
            subject: 'Physical Sciences',
            grade: 10,
            topic: 'Transverse Waves',
            questionCount: 2,
            difficulty: 'easy'
        });

        assert.ok(quiz.quizTitle || quiz.questions, 'Quiz must be generated');
        assert.equal(quiz.grade, 10, 'Grade must match request');
    });

    test('9. Specialized Module: Teacher Copilot Lesson Plan', async () => {
        const specializedModules = require('../public/src/services/ai/specializedModules');
        const plan = await specializedModules.generateLessonPlan({
            subject: 'Mathematics',
            grade: 11,
            topic: 'Analytical Geometry',
            term: 1
        });

        assert.ok(plan.lessonPlanMarkdown, 'Lesson plan markdown must be generated');
        assert.match(plan.lessonPlanMarkdown, /CAPS|Outcomes|Phases/i, 'Lesson plan must follow CAPS headings');
    });

    test('10. Specialized Module: Deterministic Class Analytics', async () => {
        const specializedModules = require('../public/src/services/ai/specializedModules');
        const stats = await specializedModules.getClassAnalytics({ classId: 1 });

        if (!stats.error) {
            assert.ok(stats.classAverage, 'Must contain deterministic class average');
            assert.match(stats.classAverage, /%/i, 'Class average must be formatted as percentage');
            assert.ok(stats.passRate, 'Must contain deterministic pass rate');
        }
    });
});

