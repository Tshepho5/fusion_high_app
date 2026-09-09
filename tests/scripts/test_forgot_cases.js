const db = require('../../db/db');
const { forgotPassword } = require('../../public/src/controller/authController');

async function test() {
  const inputs = [
    'nonexistent@example.com',
    'fakeuser123@gmail.com',
    'random999',
    'notanaccount@yahoo.com',
    'admin@fusionhigh.co.za',
    'test@test.com',
    '1234567890123',
    'admin'
  ];

  for (const input of inputs) {
    let statusCode = 200;
    let jsonResult = null;
    const req = { body: { email: input } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      }
    };

    await forgotPassword(req, res);
    console.log(`Input: "${input}" -> Status: ${statusCode}`, jsonResult);
  }
  process.exit(0);
}

test();
