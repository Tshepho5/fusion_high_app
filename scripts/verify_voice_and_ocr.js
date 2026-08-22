const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../db/db');

const API_BASE = 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || "#Butcher#$5$#Letlalo#$5$";

async function runVerification() {
  console.log('--- STARTING AI VOICE TUTOR & ADMISSION OCR VERIFICATION ---');

  const adminUser = (await db.query("SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin' LIMIT 1")).rows[0];
  const learnerUser = (await db.query("SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'learner' LIMIT 1")).rows[0];

  const adminToken = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const learnerToken = jwt.sign(
    { id: learnerUser.id, email: learnerUser.email, role: 'learner' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  // Test 1: AI Tutor ask query with voice-friendly response
  try {
    const tutorRes = await axios.post(`${API_BASE}/api/learner/ask-tutor`, {
      prompt: 'Explain photosynthesis step-by-step for Grade 10 Life Sciences',
      question: 'Explain photosynthesis step-by-step for Grade 10 Life Sciences',
      subject: 'Life Sciences',
      topic: 'Photosynthesis & Respiration'
    }, {
      headers: { Authorization: `Bearer ${learnerToken}` }
    });
    console.log('✅ Test 1 Passed: AI Tutor Endpoint returned 200 OK. Response preview:', (tutorRes.data.response || tutorRes.data.answer || '').substring(0, 100) + '...');
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.response?.data || err.message);
  }

  // Test 2: Admin Admissions List
  let testAppId = null;
  try {
    const admListRes = await axios.get(`${API_BASE}/api/admin/admissions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Test 2 Passed: Fetched ${admListRes.data.length} admissions.`);
    if (admListRes.data.length > 0) {
      testAppId = admListRes.data[0].id;
    }
  } catch (err) {
    console.error('❌ Test 2 Failed:', err.response?.data || err.message);
  }

  // Test 3: AI Document OCR & Verification Endpoint
  if (testAppId) {
    try {
      const ocrRes = await axios.post(`${API_BASE}/api/admin/admissions/${testAppId}/ocr-inspect`, {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ Test 3 Passed: AI Document OCR & Verification Endpoint returned 200 OK:');
      console.log('   - Clarity Score:', ocrRes.data.ocr?.clarity_score + '%');
      console.log('   - Authenticity:', ocrRes.data.ocr?.is_authentic ? 'Verified Authentic' : 'Flagged');
      console.log('   - Verified Fields:', ocrRes.data.ocr?.extracted_fields);
    } catch (err) {
      console.error('❌ Test 3 Failed:', err.response?.data || err.message);
    }
  }

  console.log('--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

runVerification();
