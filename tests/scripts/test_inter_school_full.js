const db = require('../../db/db');
const interSchoolController = require('../../public/src/controller/interSchoolController');

async function check() {
  try {
    const triggers = await db.query(`
      SELECT trigger_name, action_statement 
      FROM information_schema.triggers 
      WHERE event_object_table = 'inter_school_competitions'
    `);
    console.log('Triggers:', triggers.rows);

    const policies = await db.query(`
      SELECT * FROM pg_policies WHERE tablename = 'inter_school_competitions'
    `);
    console.log('Policies:', policies.rows);

    // Let's test scheduling a competition via interSchoolController.createCompetition
    console.log('\n--- Testing createCompetition ---');
    const reqCreate = {
      body: {
        title: 'Test Olympiad',
        activity_type: 'Mathematics Olympiad',
        category: 'academics',
        home_school_id: 1,
        away_school_id: 2,
        event_date: '2026-09-15T10:00:00Z',
        venue: 'Main Hall',
        trophy_title: 'Math Cup',
        highlights: 'Finals'
      },
      user: { id: 1 }
    };
    let createdComp = null;
    const resCreate = {
      status: (code) => ({
        json: (d) => {
          console.log('Create response status:', code, d);
          if (d.competition) createdComp = d.competition;
        }
      }),
      json: (d) => {
        console.log('Create response json:', d);
        if (d.competition) createdComp = d.competition;
      }
    };

    await interSchoolController.createCompetition(reqCreate, resCreate);

    // Now test getCompetitions after row exists
    console.log('\n--- Testing getCompetitions after insert ---');
    const reqGet = {
      query: { category: 'all' },
      user: { id: 1, school_id: 1 }
    };
    const resGet = {
      status: (code) => ({
        json: (d) => console.log('Get error status:', code, d)
      }),
      json: (d) => console.log('Get success competitions count:', d.competitions?.length, d.competitions?.[0]?.title)
    };
    await interSchoolController.getCompetitions(reqGet, resGet);

    // Now test with category = 'academics'
    console.log('\n--- Testing getCompetitions category=academics ---');
    await interSchoolController.getCompetitions({ query: { category: 'academics' } }, resGet);

    // Now test with school_id = '1'
    console.log('\n--- Testing getCompetitions school_id=1 ---');
    await interSchoolController.getCompetitions({ query: { school_id: '1' } }, resGet);

    // Now test getLeaderboard
    console.log('\n--- Testing getLeaderboard ---');
    const resLead = {
      status: (code) => ({ json: (d) => console.log('Leaderboard error:', code, d) }),
      json: (d) => console.log('Leaderboard success count:', d.leaderboard?.length)
    };
    await interSchoolController.getLeaderboard({ query: { category: 'academics' } }, resLead);

    // Clean up test row
    if (createdComp && createdComp.id) {
      await db.query('DELETE FROM inter_school_competitions WHERE id = $1', [createdComp.id]);
      console.log('Cleaned up test row', createdComp.id);
    }

  } catch (err) {
    console.error('Error during check:', err);
  } finally {
    process.exit(0);
  }
}

check();
