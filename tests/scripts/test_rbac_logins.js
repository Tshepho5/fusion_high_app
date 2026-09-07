const https = require('https');

function testLogin(email, password, expectedRole) {
  return new Promise(resolve => {
    const payload = JSON.stringify({ email, password });
    const req = https.request('https://fusion-high-backend.onrender.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          const match = json.role === expectedRole;
          console.log(`[${expectedRole.toUpperCase()}] ${email} -> Status: ${res.statusCode} | Returned Role: "${json.role}" | Match: ${match}`);
        } catch (e) {
          console.log(`[${expectedRole.toUpperCase()}] ${email} -> Error: ${d}`);
        }
        resolve();
      });
    });
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('--- TESTING ROLE-BASED AUTHENTICATION ON LIVE BACKEND ---');
  await testLogin('tshepomakola23@gmail.com', '#Butcher#$5$', 'admin');
  await testLogin('mothopeng.bont13@gmail.com', 'password123', 'teacher');
  await testLogin('thatojunior652@gmail.com', 'password123', 'parent');
  await testLogin('senyanyathiprecious.makula@thutotech.ac.za', 'password123', 'learner');
}

run();
