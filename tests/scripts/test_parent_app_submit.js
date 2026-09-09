const parentAppController = require('../../public/src/controller/parentApplicationController');
const emailService = require('../../public/src/services/emailService');

async function testSubmit() {
  console.log('Testing submitParentApplication with various payloads...');

  // Check emailService.templates
  console.log('emailService.templates keys:', Object.keys(emailService.templates || {}));
  console.log('parentApplicationReceived exists?', typeof emailService?.templates?.parentApplicationReceived);

  // Test 1: User without child (skip child linking or child not specified)
  const req1 = {
    body: {
      parent_name: 'Bontle',
      parent_surname: 'Pretty',
      parent_id_number: '8506125000081',
      parent_email: 'bontlepretty222@gmail.com',
      parent_phone: '0821234567',
      password: 'Password123!',
      confirm_password: 'Password123!',
      school_id: 1,
      children: []
    }
  };

  const res1 = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { console.log('Response 1 (status ' + this.statusCode + '):', data); return this; }
  };

  await parentAppController.submitParentApplication(req1, res1);

  // Test 2: User with child specified in children array
  const req2 = {
    body: {
      parent_name: 'Bontle',
      parent_surname: 'Pretty',
      parent_id_number: '8506125000081',
      parent_email: 'bontletest555@gmail.com',
      parent_phone: '0821234567',
      password: 'Password123!',
      confirm_password: 'Password123!',
      school_id: 1,
      child_first_name: 'Reoikantse',
      child_surname: 'Tshiamo',
      child_id_number: '0905095000089',
      child_grade: 10,
      child_stream: 'Science',
      children: [
        {
          firstName: 'Reoikantse',
          surname: 'Tshiamo',
          idNumber: '0905095000089',
          grade: 10,
          stream: 'Science'
        }
      ]
    }
  };

  const res2 = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { console.log('Response 2 (status ' + this.statusCode + '):', data); return this; }
  };

  await parentAppController.submitParentApplication(req2, res2);

  process.exit(0);
}

testSubmit().catch(e => { console.error('CRASH:', e); process.exit(1); });
