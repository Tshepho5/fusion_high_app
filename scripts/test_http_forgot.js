const https = require('https');

function testForgot(email) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ email });
    const req = https.request('https://fusion-high-backend.onrender.com/api/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[Forgot ${email}] Status: ${res.statusCode} -> ${data}`);
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
  await testForgot('tshepomakola23@gmail.com');
}

run();
