const db = require('../db/db');
const { forgotPassword, verifyOTP } = require('../public/src/controller/authController');

async function testOtp() {
  const reqGen = { body: { email: 'tshepomakola23@gmail.com' }, get: () => 'http://localhost:4000' };
  let genRes = null;
  const resGen = { json: (d) => { genRes = d; }, status: () => resGen };
  
  await forgotPassword(reqGen, resGen);
  console.log('1. Generated OTP Response:', genRes);
  
  const user = await db.query('SELECT reset_code, reset_expiry, NOW() as cur_time FROM users WHERE email = $1', ['tshepomakola23@gmail.com']);
  console.log('2. DB Record Expiry & Code:', user.rows[0]);
  
  const reqVer = { body: { email: 'tshepomakola23@gmail.com', otp: user.rows[0].reset_code } };
  let verRes = null;
  const resVer = { json: (d) => { verRes = d; }, status: () => resVer };
  await verifyOTP(reqVer, resVer);
  console.log('3. Verify OTP within 60s:', verRes);
  
  // Test expired code by setting expiry in the past
  await db.query("UPDATE users SET reset_expiry = NOW() - INTERVAL '10 seconds' WHERE email = $1", ['tshepomakola23@gmail.com']);
  let expRes = null;
  let statusCaptured = 200;
  const resExp = { 
    status: (s) => { statusCaptured = s; return resExp; },
    json: (d) => { expRes = d; }
  };
  await verifyOTP(reqVer, resExp);
  console.log('4. Verify Expired OTP (Status ' + statusCaptured + '):', expRes);
  
  process.exit(0);
}
testOtp();
