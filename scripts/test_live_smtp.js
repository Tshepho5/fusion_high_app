const emailService = require('../public/src/services/emailService');

async function testEmail() {
  try {
    console.log('--- TESTING LIVE SMTP CONFIGURATION ---');
    const target = 'tshepomakola22@gmail.com';
    console.log('Sending test OTP email to:', target);

    const tpl = emailService.templates.forgotPassword('8842', target, 'https://educonnect-cmyh.onrender.com');
    const result = await emailService.send(target, tpl.subject, tpl.body);
    console.log('Result:', result);
    process.exit(0);
  } catch (err) {
    console.error('Test Email Exception:', err);
    process.exit(1);
  }
}

testEmail();
