const textbookController = require('../public/src/controller/teacher/teacherTextbookController');

async function testGenerateQuestions() {
  const tests = [
    { subject: 'Physical Sciences', grade: 10, class_name: '10A', topic: 'Transverse Waves' },
    { subject: 'Physical Sciences', grade: 11, class_name: '11A', topic: "Newton's Laws" },
    { subject: 'English FAL', grade: 8, class_name: '8A', topic: 'Figures of Speech' },
    { subject: 'Accounting', grade: 10, class_name: '10B', topic: 'Accounting Equation' }
  ];

  for (const t of tests) {
    console.log(`\nTesting ${t.subject} Grade ${t.grade} Class ${t.class_name} Topic: ${t.topic}...`);
    const req = {
      user: { id: 2, school_id: 1 },
      body: {
        subject: t.subject,
        grade: t.grade,
        class_name: t.class_name,
        topic: t.topic,
        count: 3,
        marks_per_question: 2
      }
    };
    const res = {
      json: (data) => {
        const questions = data.questions || [];
        console.log(`Generated ${questions.length} questions:`);
        questions.forEach((q, i) => {
          console.log(`  [Q${i + 1}] ${q.question}`);
          console.log(`    Answer: ${q.answer}`);
          if (q.question.startsWith('[Grade')) {
            console.error('    FAIL: Question starts with [Grade tag!');
          } else {
            console.log('    PASS: Clean question stem (no [Grade tag)');
          }
        });
      },
      status: (code) => ({
        json: (err) => console.error(`Error ${code}:`, err)
      })
    };

    await textbookController.generateAIQuestions(req, res);
  }

  process.exit(0);
}

testGenerateQuestions();
