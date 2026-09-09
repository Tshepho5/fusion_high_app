const adminController = require('../../public/src/controller/adminController');

async function test() {
  try {
    const req = {
      query: {},
      user: { id: 1, role: 'admin', school_id: 1 }
    };
    const res = {
      json: (d) => {
        console.log('getAllLearners success! Count:', Array.isArray(d) ? d.length : (d.learners?.length || d));
        if (Array.isArray(d) && d.length > 0) {
          console.log('Sample learner:', d[0]);
        } else if (d.learners && d.learners.length > 0) {
          console.log('Sample learner:', d.learners[0]);
        }
      },
      status: (c) => ({
        json: (e) => console.log('getAllLearners error:', c, e)
      })
    };
    await adminController.getAllLearners(req, res);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

test();
