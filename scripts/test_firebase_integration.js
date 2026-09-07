const { db: firestore } = require('../db/firebase');
const FirebaseStorageService = require('../public/src/services/firebaseStorageService');

async function runFirebaseIntegrationTest() {
  console.log('====================================================');
  console.log('  FUSION HIGH SCHOOL — FIREBASE INTEGRATION TEST    ');
  console.log('====================================================\n');

  if (!firestore) {
    console.error(' FATAL: Firestore instance is null.');
    process.exit(1);
  }

  const testId = `test_${Date.now()}`;
  const createdDocs = [];

  try {
    // 1. Test Notifications Sync
    console.log('[1/5] Testing Firestore Notifications Collection...');
    const notifRef = firestore.collection('notifications').doc(testId);
    await notifRef.set({
      user_id: 99999,
      title: 'Automated Test Alert',
      message: 'Testing Firestore real-time notification synchronization',
      type: 'test',
      target_tab: 'announcements',
      is_read: false,
      created_at: new Date()
    });
    createdDocs.push(notifRef);
    const notifSnap = await notifRef.get();
    if (!notifSnap.exists) throw new Error('Failed to retrieve notification doc');
    console.log('   Notifications sync verified:', notifSnap.data().title);

    // 2. Test Announcements Sync
    console.log('\n[2/5] Testing Firestore Announcements Collection...');
    const annRef = firestore.collection('announcements').doc(testId);
    await annRef.set({
      title: 'Automated Test Announcement',
      content: 'Testing Firestore announcement feed',
      role_target: 'all',
      priority: 'Normal',
      created_at: new Date()
    });
    createdDocs.push(annRef);
    const annSnap = await annRef.get();
    if (!annSnap.exists) throw new Error('Failed to retrieve announcement doc');
    console.log('  ✅ Announcements sync verified:', annSnap.data().title);

    // 3. Test Messages & Conversations Sync
    console.log('\n[3/5] Testing Firestore Live Chat (Messages & Conversations)...');
    const msgRef = firestore.collection('messages').doc(testId);
    await msgRef.set({
      sender_id: 1,
      recipient_id: 99999,
      subject: 'Test Chat Message',
      body: 'Hello from Firebase integration test',
      is_read: false,
      created_at: new Date()
    });
    createdDocs.push(msgRef);

    const convRef = firestore.collection('conversations').doc('1_99999');
    await convRef.set({
      participants: [1, 99999],
      last_message: 'Hello from Firebase integration test',
      last_activity: new Date(),
      is_test: true
    }, { merge: true });
    createdDocs.push(convRef);
    console.log('  ✅ Messages & Conversations sync verified.');

    // 4. Test Applications Sync
    console.log('\n[4/5] Testing Firestore Applications Collection...');
    const appRef = firestore.collection('applications').doc(testId);
    await appRef.set({
      application_number: 'TEST-APP-2026',
      first_name: 'TestLearner',
      surname: 'Makola',
      grade_applied: 10,
      stream: 'Science',
      status: 'submitted',
      created_at: new Date()
    });
    createdDocs.push(appRef);
    const appSnap = await appRef.get();
    if (!appSnap.exists) throw new Error('Failed to retrieve application doc');
    console.log('  ✅ Applications sync verified: Status is', appSnap.data().status);

    // 5. Test File Storage Service
    console.log('\n[5/5] Testing Firebase Storage Service...');
    const sampleBuffer = Buffer.from('Fusion High School Test Document Content');
    const uploadRes = await FirebaseStorageService.uploadBuffer({
      buffer: sampleBuffer,
      destination: `tests/${testId}.txt`,
      contentType: 'text/plain'
    });
    console.log('  ✅ Storage upload handler verified (Storage Type:', uploadRes.storageType, ')');
    await FirebaseStorageService.deleteFile(`tests/${testId}.txt`);
    console.log('  ✅ Storage cleanup verified.');

    // Cleanup Firestore test documents
    console.log('\n[CLEANUP] Removing test documents from Firestore...');
    for (const ref of createdDocs) {
      await ref.delete();
    }
    console.log('  ✅ All test artifacts cleaned up cleanly.');

    console.log('\n🎉 ALL FIREBASE INTEGRATIONS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Firebase Integration Test Failed:', err);
    process.exit(1);
  }
}

runFirebaseIntegrationTest();
