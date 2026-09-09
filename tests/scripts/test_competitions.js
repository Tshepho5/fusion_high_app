const interSchoolController = require('../../public/src/controller/interSchoolController');

async function test() {
  const cases = [
    {},
    { category: 'all' },
    { category: 'sports' },
    { school_id: '1' },
    { school_id: 'undefined' },
    { school_id: 1 },
    { status: 'scheduled' },
    { category: 'sports', school_id: '1' }
  ];

  for (const q of cases) {
    console.log('Testing query:', q);
    const req = { query: q };
    const res = {
      json: (d) => console.log('Success:', d.competitions?.length),
      status: (code) => ({
        json: (d) => console.log('Error status', code, d)
      })
    };
    await interSchoolController.getCompetitions(req, res);
  }
  process.exit(0);
}

test();
