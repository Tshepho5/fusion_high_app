const learnerController = require('../public/src/controller/learnerController');

async function test(userId, label) {
  return new Promise((resolve) => {
    const req = { user: { id: userId } };
    const res = {
      json: (data) => {
        console.log(`\n=== ${label} (User ID ${userId}) ===`);
        console.table(data.subjects.map(s => ({
          name: s.name,
          grade: s.grade,
          teacher: s.teacher,
          classmates: s.classmates_count,
          resources: s.resources_count
        })));
        resolve();
      },
      status: (code) => {
        console.log('Status code:', code);
        resolve();
      }
    };
    learnerController.getMySubjectsOverview(req, res);
  });
}

async function run() {
  await test(5, 'Grade 10 Learner (Jane Walters)');
  await test(6, 'Grade 11 Learner (David Walters)');
  await test(7, 'Grade 12 Learner (Sarah Walters)');
  process.exit(0);
}

run().catch(console.error);
