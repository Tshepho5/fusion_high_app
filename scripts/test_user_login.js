const db = require('../db/db');
const authController = require('../public/src/controller/authController');

async function run() {
  const req = {
    body: {
      email: '202247878@myturf.ul.ac.za',
      password: '#Makola#$5$'
    }
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log(`[RESPONSE CODE ${this.statusCode}]:`, JSON.stringify(data, null, 2));
      process.exit(0);
    }
  };

  console.log('Attempting login with 202247878@myturf.ul.ac.za...');
  await authController.login(req, res);
}

run().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
