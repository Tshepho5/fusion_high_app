const https = require('https');

function test(email, password) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ email, password });
    const req = https.request('https://fusion-high-backend.onrender.com/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${email}] Status: ${res.statusCode} -> ${data.substring(0, 100)}...`);
        resolve();
      });
    });
    req.on('error', err => {
      console.error(err);
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('Testing live Render backend logins:');
  await test('tshepomakola23@gmail.com', '#Butcher#$5$');
  await test('tshepomakola22@gmail.com', '#Butcher#$5$');
  await test('202247878@myturf.ul.ac.za', '#Makola#$5$');
  await test('mothopeng.bont13@gmail.com', 'password123');
  await test('thatojunior652@gmail.com', 'password123');
}

run();
