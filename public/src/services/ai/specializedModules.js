const aiProvider = require('./aiProvider');
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

        const prompt = `You are the Geleza AI CAPS Educational Tutor.
Subject: ${subject}
Grade: ${grade}
Topic: ${topic}
Difficulty: ${difficulty}
Total Questions: ${questionCount}

APPROVED DBE CAPS CURRICULUM CONTEXT:
${contextSnippet || 'Use South Africa DBE CAPS standards for this topic.'}

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

        const res = await aiProvider.generateContent({
            prompt,
            temperature: 0.2
        });

        try {
            const cleanJson = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            // Fallback structured quiz if model returns text
            return {
                quizTitle: `${subject} Grade ${grade}: ${topic} Practice`,
                subject,
                grade,
                topic,
                rawExplanation: res.text
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
        const prompt = `You are the Geleza Teacher Copilot. Draft an official CAPS lesson plan for South African educators.
Subject: ${subject}
Grade: ${grade}
Topic: ${topic}
Term: Term ${term}
Lesson Duration: ${durationMinutes} minutes

Structure your lesson plan with clear markdown headings:
1. **CAPS Specific Aims & Learning Outcomes**
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

        const res = await aiProvider.generateContent({ prompt, temperature: 0.3 });
        return {
            subject,
            grade,
            topic,
            lessonPlanMarkdown: res.text
        };
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

        const prompt = `You are the Geleza Teacher Copilot. Generate a complete official test paper and marking memorandum.
Subject: ${subject}
Grade: ${grade}
Topic: ${topic}
Total Marks: ${totalMarks} Marks

APPROVED CAPS CURRICULUM CONTEXT:
${contextSnippet}

Requirements:
- Balance questions according to DBE CAPS cognitive levels:
  * Level 1: Knowledge / Recall (~20%)
  * Level 2: Routine Procedure (~35%)
  * Level 3: Complex Procedure (~30%)
  * Level 4: Problem Solving (~15%)
- Mark allocations on every question (e.g., [2], [4], [5]).
- Complete **SECTION B: MARKING MEMORANDUM & GUIDELINES** with step-by-step mark breakdown (e.g., ✓ Formula, ✓ Substitution, ✓ Final SI unit).`;

        const res = await aiProvider.generateContent({ prompt, temperature: 0.3 });
        return {
            subject,
            grade,
            topic,
            totalMarks,
            assessmentMarkdown: res.text
        };
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
    async getClassAnalytics({ classId }) {
        const learnersRes = await db.query(
            `SELECT c.id, c.full_name, c.surname, c.grade, cl.name as class_name 
             FROM children c
             JOIN classes cl ON c.class_id = cl.id
             WHERE c.class_id = $1`,
            [classId]
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
            const sc = parseFloat(r.score) || 0;
            const mx = parseFloat(r.total_marks) || 100;
            totalScore += sc;
            totalMax += mx;
            const pct = mx > 0 ? (sc / mx) * 100 : 0;
            if (pct > highestPct) highestPct = pct;
            if (pct < lowestPct) lowestPct = pct;
            if (pct >= 50) passCount++;
            else failCount++;
        });

        const totalTasks = marksRes.rows.length;
        const classAverage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        const passRate = totalTasks > 0 ? Math.round((passCount / totalTasks) * 100) : 100;

        return {
            className: learnersRes.rows[0].class_name,
            totalEnrolledLearners: learnersRes.rows.length,
            totalGradedSubmissions: totalTasks,
            classAverage: `${classAverage}%`,
            highestScore: `${Math.round(highestPct)}%`,
            lowestScore: totalTasks > 0 ? `${Math.round(lowestPct)}%` : '0%',
            passRate: `${passRate}%`,
            academicHealthStatus: classAverage >= 60 ? 'Healthy Performance' : 'Requires Intervention'
        };
    }
}

module.exports = new SpecializedAiModules();
