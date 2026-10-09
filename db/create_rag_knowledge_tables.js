const fs = require('fs');
const path = require('path');
const db = require('./db');

async function createRagKnowledgeTables() {
    console.log('[RAG MIGRATION] Initializing School Knowledge & Curriculum RAG tables...');
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS school_documents (
                id SERIAL PRIMARY KEY,
                school_id INTEGER NULL, -- NULL means national/global curriculum, integer means school-private
                title VARCHAR(255) NOT NULL,
                document_type VARCHAR(50) NOT NULL, -- caps_curriculum, school_policy, code_of_conduct, exam_guidelines, aps_requirements
                grade INTEGER NULL,
                subject VARCHAR(100) NULL,
                source_url TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS school_document_chunks (
                id SERIAL PRIMARY KEY,
                document_id INTEGER NOT NULL REFERENCES school_documents(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                topic VARCHAR(255) NULL,
                subtopic VARCHAR(255) NULL,
                content TEXT NOT NULL,
                metadata JSONB DEFAULT '{}',
                search_vector TSVECTOR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_rag_docs_school ON school_documents(school_id, subject, grade);
            CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc_id ON school_document_chunks(document_id);
            CREATE INDEX IF NOT EXISTS idx_rag_chunks_search ON school_document_chunks USING GIN(search_vector);
        `);

        // Check if documents already seeded
        const countRes = await db.query('SELECT COUNT(*)::int as count FROM school_documents');
        if (countRes.rows[0].count > 0) {
            console.log('[RAG MIGRATION] ✅ Knowledge tables verified (already populated with documents).');
            return;
        }

        console.log('[RAG MIGRATION] Seeding South African CAPS curriculum and institutional policies...');

        // 1. Seed Core South African Policies
        const policies = [
            {
                title: 'South African Schools Act & National Attendance Policy',
                document_type: 'school_policy',
                grade: null,
                subject: 'General Administration',
                chunks: [
                    {
                        topic: 'School Attendance Requirements',
                        subtopic: 'Compulsory Schooling & Absence Procedures',
                        content: `Under the South African Schools Act (SASA) Act 84 of 1996 and DBE Attendance Policy, schooling is compulsory for learners aged 7 to 15 (Grades 1 through 9).
A learner must attend school on every school day unless an official valid reason applies:
1. Illness with a signed medical certificate for 2 or more consecutive days.
2. Bereavement of an immediate family member.
3. Observance of a recognized religious holiday.
4. Exceptional circumstances granted in writing by the School Principal.
Continuous unexcused absence for 10 or more consecutive school days results in formal review and potential de-registration according to DBE statutory notices.`
                    },
                    {
                        topic: 'Late Arrival & Period Attendance',
                        subtopic: 'Daily Period Marking & Parent Notification',
                        content: `Attendance is recorded period-by-period by educators in the Geleza SA management portal.
Learners arriving after the official school bell (07:45 AM) are marked 'Late'.
When a learner is marked 'Absent' or 'Late' without prior written notification, the automated Geleza notification engine immediately dispatches an SMS/Email alert to registered parents or guardians.`
                    }
                ]
            },
            {
                title: 'Official CAPS Assessment & Promotion Requirements (Grades 8 - 12)',
                document_type: 'exam_guidelines',
                grade: null,
                subject: 'Academic Assessment',
                chunks: [
                    {
                        topic: 'CAPS Mark Weights & School-Based Assessment (SBA)',
                        subtopic: 'SBA Weighting vs End-of-Year Examination',
                        content: `In the South African National Curriculum Statement (CAPS):
- Senior Phase (Grades 8 and 9): Continuous School-Based Assessment (SBA) contributes 40% and the final End-of-Year examination contributes 60% of the final promotion mark.
- FET Phase (Grades 10, 11, and 12): SBA tasks contribute 25% of the promotion mark, while the End-of-Year examination contributes 75%.
- In Grade 12 (Matric), the final National Senior Certificate (NSC) results are calculated from 25% SBA and 75% external DBE examination.`
                    },
                    {
                        topic: 'CAPS 7-Level Achievement Scale',
                        subtopic: 'Rating Codes & Percentage Bands',
                        content: `The official DBE CAPS academic achievement scale:
- Level 7 (80% - 100%): Outstanding Achievement
- Level 6 (70% - 79%): Meritorious Achievement
- Level 5 (60% - 69%): Substantial Achievement
- Level 4 (50% - 59%): Moderate Achievement
- Level 3 (40% - 49%): Adequate Achievement
- Level 2 (30% - 39%): Elementary Achievement
- Level 1 (0% - 29%): Not Achieved`
                    },
                    {
                        topic: 'National Senior Certificate (Matric) Pass Requirements',
                        subtopic: 'Bachelor, Diploma, and Higher Certificate Requirements',
                        content: `To qualify for higher education studies upon completing Grade 12:
1. Higher Certificate Pass: Minimum 40% in Home Language, 40% in two other subjects, and 30% in three other subjects.
2. Diploma Pass: Minimum 40% in Home Language, 40% in three recognized subjects (excluding Life Orientation), and 30% in two other subjects.
3. Bachelor Degree Endorsement: Minimum 40% in Home Language, minimum 50% in four recognized 20-credit subjects (excluding Life Orientation), and 30% in two other subjects.`
                    }
                ]
            },
            {
                title: 'Admission Point Score (APS) & University Calculations',
                document_type: 'aps_requirements',
                grade: 12,
                subject: 'Career & University Guidance',
                chunks: [
                    {
                        topic: 'Calculating Admission Point Score (APS)',
                        subtopic: 'Point Conversion Scale',
                        content: `The Admission Point Score (APS) converts the marks of the six best subjects (excluding Life Orientation in most institutions) into points from 1 to 7:
- 80% to 100% = 7 points
- 70% to 79% = 6 points
- 60% to 69% = 5 points
- 50% to 59% = 4 points
- 40% to 49% = 3 points
- 30% to 39% = 2 points
- 0% to 29% = 1 point
Maximum APS (best 6 subjects) = 42 points. Typical degree requirements:
- Medicine (MBChB): APS 38 - 42 with minimum 75% in Mathematics and Physical Sciences.
- Engineering (BEng / BSc Eng): APS 35 - 40 with minimum 70% in Mathematics and Physical Sciences.
- Computer Science / IT: APS 32 - 38 with minimum 65% in Mathematics.
- Commerce & Accounting (BCom CA): APS 34 - 38 with minimum 60% in Mathematics.`
                    }
                ]
            }
        ];

        for (const p of policies) {
            const docRes = await db.query(
                `INSERT INTO school_documents (school_id, title, document_type, grade, subject)
                 VALUES (NULL, $1, $2, $3, $4) RETURNING id`,
                [p.title, p.document_type, p.grade, p.subject]
            );
            const docId = docRes.rows[0].id;

            for (let i = 0; i < p.chunks.length; i++) {
                const c = p.chunks[i];
                await db.query(
                    `INSERT INTO school_document_chunks (document_id, chunk_index, topic, subtopic, content, search_vector)
                     VALUES ($1, $2, $3, $4, $5, to_tsvector('english', $6))`,
                    [docId, i + 1, c.topic, c.subtopic, c.content, `${c.topic} ${c.subtopic || ''} ${c.content}`]
                );
            }
        }

        // 2. Seed CAPS Subject Knowledge Bases from data/*.json
        const kbFiles = [
            { file: 'mathematics_grade12_kb.json', subject: 'Mathematics', grade: 12, title: 'Grade 12 Mathematics CAPS Core Knowledge Base' },
            { file: 'physical_sciences_grade10_kb.json', subject: 'Physical Sciences', grade: 10, title: 'Grade 10 Physical Sciences CAPS Core Knowledge Base' },
            { file: 'physical_sciences_grade12_kb.json', subject: 'Physical Sciences', grade: 12, title: 'Grade 12 Physical Sciences CAPS Core Knowledge Base' },
            { file: 'life_sciences_grade12_kb.json', subject: 'Life Sciences', grade: 12, title: 'Grade 12 Life Sciences CAPS Core Knowledge Base' }
        ];

        for (const kf of kbFiles) {
            const filePath = path.join(__dirname, '../data', kf.file);
            if (fs.existsSync(filePath)) {
                try {
                    const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const docRes = await db.query(
                        `INSERT INTO school_documents (school_id, title, document_type, grade, subject)
                         VALUES (NULL, $1, 'caps_curriculum', $2, $3) RETURNING id`,
                        [kf.title, kf.grade, kf.subject]
                    );
                    const docId = docRes.rows[0].id;

                    for (let idx = 0; idx < items.length; idx++) {
                        const item = items[idx];
                        const content = `[${item.paper || ''}] ${item.topic} - ${item.subtopic || ''}
QUESTION / CONCEPT: ${item.question || ''}
KEY DEFINITION & FORMULA: ${item.prescribed_definition || ''} | Formula: ${item.formula || 'N/A'}
MODEL DBE ANSWER & STEPS:
${item.model_answer || ''}
OFFICIAL RUBRIC POINTS:
${Array.isArray(item.rubric_points) ? item.rubric_points.join('\n') : ''}
EXAM PITFALL & TIP: ${item.common_misconceptions || ''}
TEACHER GUIDANCE: ${item.human_guidance || ''}`;

                        const searchSource = `${item.topic} ${item.subtopic || ''} ${(item.keywords || []).join(' ')} ${content}`;

                        await db.query(
                            `INSERT INTO school_document_chunks (document_id, chunk_index, topic, subtopic, content, metadata, search_vector)
                             VALUES ($1, $2, $3, $4, $5, $6, to_tsvector('english', $7))`,
                            [
                                docId,
                                idx + 1,
                                item.topic,
                                item.subtopic || null,
                                content,
                                JSON.stringify({ id: item.id, paper: item.paper, formula: item.formula }),
                                searchSource
                            ]
                        );
                    }
                    console.log(`[RAG MIGRATION] Indexed ${items.length} topics for ${kf.title}`);
                } catch (err) {
                    console.warn(`[RAG MIGRATION WARN] Could not index ${kf.file}:`, err.message);
                }
            }
        }

        console.log('[RAG MIGRATION] ✅ Knowledge base populated and indexed successfully.');
    } catch (err) {
        console.error('[RAG MIGRATION ERROR]:', err.message);
        throw err;
    }
}

if (require.main === module) {
    createRagKnowledgeTables()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = createRagKnowledgeTables;
