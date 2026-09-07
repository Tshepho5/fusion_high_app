const db = require('../db/db');

async function run() {
  try {
    console.log('--- CHECKING TABLE SCHEMA ---');
    const cols = await db.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'inter_school_competitions'
      ORDER BY ordinal_position;
    `);
    console.log(cols.rows);

    console.log('--- TESTING getCompetitions queries ---');
    const interSchoolController = require('../public/src/controller/interSchoolController');

    const fakeReq1 = { query: { category: 'all' } };
    const fakeRes1 = {
      json: (d) => console.log('Req1 Success:', d.competitions?.length),
      status: (c) => ({ json: (e) => console.error('Req1 Error:', c, e) })
    };
    await interSchoolController.getCompetitions(fakeReq1, fakeRes1);

    const fakeReq2 = { query: { category: 'sports' } };
    const fakeRes2 = {
      json: (d) => console.log('Req2 Success:', d.competitions?.length),
      status: (c) => ({ json: (e) => console.error('Req2 Error:', c, e) })
    };
    await interSchoolController.getCompetitions(fakeReq2, fakeRes2);

    const fakeReq3 = { query: { category: 'all', school_id: '1' } };
    const fakeRes3 = {
      json: (d) => console.log('Req3 Success:', d.competitions?.length),
      status: (c) => ({ json: (e) => console.error('Req3 Error:', c, e) })
    };
    await interSchoolController.getCompetitions(fakeReq3, fakeRes3);

    console.log('--- TESTING getLeaderboard query ---');
    const fakeReqLead = { query: { category: 'all' } };
    const fakeResLead = {
      json: (d) => console.log('Leaderboard Success:', d.leaderboard?.length),
      status: (c) => ({ json: (e) => console.error('Leaderboard Error:', c, e) })
    };
    await interSchoolController.getLeaderboard(fakeReqLead, fakeResLead);

    process.exit(0);
  } catch (e) {
    console.error('Fatal Error:', e);
    process.exit(1);
  }
}

run();
