const aiProvider = require('./aiProvider');
const { assessmentDraft } = require('../../../../lib/assessmentDraft');
const ragService = require('./ragService');
const db = require('../../../../db/db');

class SpecializedAiModules {
    /**
     * MODULE 2: GELEZA TUTOR
     * Generates an interactive CAPS-aligned practice quiz with hints & step-by-step solutions
     */
    async generateTutorQuiz({ subject, grade, topic, questionCount = 3, difficulty = 'medium' }) {
        // Retrieve grounded CAPS knowledge for this topic
        const knowledgeItems = await ragService.searchKnowledge({
            query: `${subject} ${topic}`,
            subject,
            grade,
            limit: 3
        });

        const contextSnippet = knowledgeItems.map(k => k.snippet).join('\n---\n');

        const prompt = `You are a study tutor. This quiz is a draft for practice.
Subject: ${subject}
Grade: ${grade}
Topic: ${topic}
Difficulty: ${difficulty}
Total Questions: ${questionCount}

Retrieved notes:
${contextSnippet || 'No curriculum note was retrieved. Do not claim this quiz is CAPS-approved or officially aligned.'}

Generate a structured practice quiz in valid JSON format only (no markdown code blocks, just raw JSON).
Output schema:
{
  "quizTitle": "string",
  "subject": "${subject}",
  "grade": ${grade},
  "topic": "${topic}",
  "questions": [
    {
      "id": 1,
      "cognitiveLevel": "Knowledge | Routine Procedure | Complex Procedure | Problem Solving",
      "questionText": "string",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctOptionIndex": 0,
      "hint": "helpful hint guiding the learner without revealing the answer",
      "stepByStepExplanation": "detailed step-by-step solution explaining why the answer is correct",
      "marks": 2
    }
  ]
}`;

        try {
            const res = await aiProvider.generateContent({
                prompt,
                temperature: 0.2
            });
            const cleanJson = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const quiz = JSON.parse(cleanJson);
            return { ...quiz, status: 'draft', official: false, caps_verified: Boolean(contextSnippet) };
        } catch (e) {
            return {
                status: 'draft',
                official: false,
                caps_verified: false,
                provider_status: 'unavailable',
                subject,
                grade,
                topic,
                questions: null,
                message: 'A practice quiz was not produced. Nothing was saved.'
            };
        }
    }

    /**
     * MODULE 2: GELEZA TUTOR
     * Explains a student mistake constructively
     */
    async explainStudentMistake({ subject, grade, question, studentAnswer, correctAnswer }) {
        const prompt = `You are a warm, encouraging South African CAPS tutor.
Subject: ${subject} (Grade ${grade})
Question: ${question}
Learner's Answer: ${studentAnswer}
Correct Answer: ${correctAnswer}

Provide a constructive explanation:
1. Validate what the learner got right or their thinking process.
2. Pinpoint the exact conceptual or calculation step where the error occurred.
3. Show the correct method step-by-step.
4. Give a memorable tip to avoid this pitfall in examinations.`;

        const res = await aiProvider.generateContent({ prompt, temperature: 0.3 });
        return { feedback: res.text };
    }

    /**
     * MODULE 3: GELEZA TEACHER COPILOT
     * Generates a formal CAPS-aligned lesson plan
     */
    async generateLessonPlan({ subject, grade, topic, term = 1, durationMinutes = 60 }) {
        const prompt = `You are helping one teacher draft a lesson. Do not claim it is CAPS-approved or officially aligned.
Subject: ${subject}
Grade: ${grade}
Topic: ${topic}
Term: Term ${term}
Lesson Duration: ${durationMinutes} minutes

Structure your lesson plan with clear markdown headings:
1. **Learning aims for this draft**
2. **Prior Knowledge & Concepts Required**
3. **Resources & Equipment Needed**
4. **Lesson Phases & Time Allocation**:
   - Introduction & Mental Math / Hook (10 mins)
   - Direct Instruction & Modeling (20 mins)
   - Guided Practice & Peer Collaboration (15 mins)
   - Independent Classwork & Assessment (10 mins)
   - Lesson Closure & Homework Assignment (5 mins)
5. **Differentiated Teaching Strategies** (Support for struggling learners vs Extension for advanced learners)
6. **Formative Assessment Checkpoints & Informal Reflection Notes**`;

        try {
            const res = await aiProvider.generateContent({ prompt, temperature: 0.3 });
            return {
                status: 'draft',
                official: false,
                caps_verified: false,
                subject,
                grade,
                topic,
                durationMinutes,
                lessonPlanMarkdown: res.text
            };
        } catch (err) {
            return {
                status: 'draft',
                official: false,
                caps_verified: false,
                provider_status: 'unavailable',
                subject,
                grade,
                topic,
                durationMinutes,
                lessonPlanMarkdown: null,
                message: 'The lesson draft was not produced. The subject, grade, and topic were kept.'
            };
        }
    }

    /**
     * MODULE 3: GELEZA TEACHER COPILOT
     * Generates a formal test paper with Bloom's Taxonomy cognitive balance and complete marking memo
     */
    async generateAssessmentPaper({ subject, grade, topic, totalMarks = 30 }) {
        const knowledgeItems = await ragService.searchKnowledge({
            query: `${subject} ${topic}`,
            subject,
            grade,
            limit: 3
        });

        const contextSnippet = knowledgeItems.map(k => k.snippet).join('\n---\n');

        const prompt = `You are helping one teacher draft a test and a marking guide. Do not claim it is an official or CAPS-approved paper. Put every question mark in square brackets, such as [2]. The bracketed marks must add up to ${totalMarks}.
Subject: ${subject}
Grade: ${grade}
Topic: ${topic}
Total Marks: ${totalMarks} Marks

Retrieved notes:
${contextSnippet || 'No curriculum note was retrieved. Do not claim this paper follows an official curriculum.'}

Requirements:
- Balance questions across recall, routine procedure, complex procedure, and problem solving:
  * Level 1: Knowledge / Recall (~20%)
  * Level 2: Routine Procedure (~35%)
  * Level 3: Complex Procedure (~30%)
  * Level 4: Problem Solving (~15%)
- Mark allocations on every question (e.g., [2], [4], [5]).
- Complete **SECTION B: MARKING MEMORANDUM & GUIDELINES** with step-by-step mark breakdown (e.g., ✓ Formula, ✓ Substitution, ✓ Final SI unit).`;

        try {
            const res = await aiProvider.generateContent({ prompt, temperature: 0.3 });
            return {
                subject,
                grade,
                topic,
                totalMarks,
                assessmentMarkdown: res.text,
                ...assessmentDraft({ requestedTotal: totalMarks, text: res.text })
            };
        } catch (err) {
            return {
                ...assessmentDraft({ requestedTotal: totalMarks, text: '' }),
                provider_status: 'unavailable',
                subject,
                grade,
                topic,
                totalMarks,
                assessmentMarkdown: null,
                message: 'The paper was not produced. Nothing was published.'
            };
        }
    }

    /**
     * MODULE 4: GELEZA PARENT ASSISTANT
     * Drafts a polite, professional message from parent to educator
     */
    async draftTeacherMessage({ parentName, childName, teacherName = 'Teacher', topic, messageObjective }) {
        const prompt = `You are the Geleza Parent Assistant. Draft a respectful, professional communication from a parent to their child's teacher.
Parent Name: ${parentName}
Child Name: ${childName}
Educator: ${teacherName}
Subject/Topic: ${topic}
Goal: ${messageObjective}

Write a polite, warm, and constructive message suitable for school messaging or email.`;

        const res = await aiProvider.generateContent({ prompt, temperature: 0.3 });
        return { draftedMessage: res.text };
    }

    /**
     * MODULE 5: GELEZA INSIGHT
     * Computes deterministic class performance analytics
     */
    async getClassAnalytics({ classId, schoolId }) {
        const school = Number(schoolId);
        if (!Number.isInteger(school) || school <= 0) {
            return { error: 'Class not found', official_result: false };
        }
        const learnersRes = await db.query(
            `SELECT c.id, c.full_name, c.surname, c.grade, cl.name as class_name 
             FROM children c
             JOIN classes cl ON c.class_id = cl.id
             WHERE c.class_id = $1 AND cl.school_id = $2`,
            [classId, school]
        );

        if (learnersRes.rows.length === 0) {
            return { error: 'No learners found for this class.' };
        }

        const childIds = learnersRes.rows.map(r => r.id);

        // Fetch marks
        const marksRes = await db.query(
            `SELECT ar.child_id, ar.score, a.total_marks, a.subject
             FROM assessment_results ar
             JOIN assessments a ON ar.assessment_id = a.id
             WHERE ar.child_id = ANY($1::int[])`,
            [childIds]
        );

        // Deterministic calculations
        let totalScore = 0;
        let totalMax = 0;
        let highestPct = 0;
        let lowestPct = 100;
        let passCount = 0;
        let failCount = 0;

        marksRes.rows.forEach(r => {
            const sc = Number(r.score);
            const mx = Number(r.total_marks);
            if (!Number.isFinite(sc) || !Number.isFinite(mx) || mx <= 0) return;
            totalScore += sc;
            totalMax += mx;
            const pct = (sc / mx) * 100;
            if (pct > highestPct) highestPct = pct;
            if (pct < lowestPct) lowestPct = pct;
            if (pct >= 50) passCount++;
            else failCount++;
        });

        const totalTasks = passCount + failCount;
        const classAverage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
        const passRate = totalTasks > 0 ? Math.round((passCount / totalTasks) * 100) : null;

        return {
            className: learnersRes.rows[0].class_name,
            totalEnrolledLearners: learnersRes.rows.length,
            totalGradedSubmissions: totalTasks,
            classAverage: classAverage === null ? null : `${classAverage}%`,
            highestScore: totalTasks > 0 ? `${Math.round(highestPct)}%` : null,
            lowestScore: totalTasks > 0 ? `${Math.round(lowestPct)}%` : null,
            passRate: passRate === null ? null : `${passRate}%`,
            academicHealthStatus: classAverage === null ? 'Not enough recorded marks' : (classAverage >= 60 ? 'Recorded average is 60% or above' : 'Recorded average is below 60%'),
            official_result: false
        };
    }
}

module.exports = new SpecializedAiModules();
