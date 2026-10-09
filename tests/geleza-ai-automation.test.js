/**
 * Geleza SA AI - Phase 7 Automation & Workflows Test Suite
 * 
 * Verifies:
 * 1. Schema integrity & audit log tables
 * 2. Assignment deadline reminders (due window, missing submissions, CAPS nudges)
 * 3. Idempotency & cooldown enforcement (prevents notification spam)
 * 4. Low-attendance alerts under DBE policy thresholds
 * 5. Upcoming exam briefings & revision checklists
 * 6. Educator class risk synthesis
 * 7. Background job runner lifecycle and status
 */

const db = require('../db/db');
const gelezaAutomationService = require('../public/src/services/ai/gelezaAutomationService');
const gelezaAutomationJob = require('../public/src/services/ai/gelezaAutomationJob');

async function runTests() {
  console.log('====================================================');
  console.log('🤖 RUNNING GELEZA AI PHASE 7 AUTOMATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const cleanupIds = {
    assignments: [],
    submissions: [],
    attendance: [],
    events: [],
    logs: [],
    notifications: []
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Schema Initialization
    // ----------------------------------------------------
    console.log('\n--- Test 1: Schema Initialization ---');
    await gelezaAutomationService.ensureSchema();
    const tableRes = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'geleza_automation_logs'
    `);
    const colNames = tableRes.rows.map(r => r.column_name);
    assert(colNames.includes('job_type'), 'geleza_automation_logs has job_type column');
    assert(colNames.includes('entity_id'), 'geleza_automation_logs has entity_id column');
    assert(colNames.includes('user_id'), 'geleza_automation_logs has user_id column');
    assert(colNames.includes('dispatched_at'), 'geleza_automation_logs has dispatched_at column');

    // Fetch existing test child and school
    const childRes = await db.query('SELECT id, learner_user_id, parent_id, grade, school_id FROM children LIMIT 1');
    if (childRes.rows.length === 0) {
      throw new Error('No child record available for testing.');
    }
    const testChild = childRes.rows[0];
    const testSchoolId = testChild.school_id;
    const testGrade = testChild.grade;
    console.log(`Using test child ID: ${testChild.id}, grade: ${testGrade}, school: ${testSchoolId}`);

    // ----------------------------------------------------
    // TEST 2: Assignment Deadline Reminder (Dry-Run & Real Run)
    // ----------------------------------------------------
    console.log('\n--- Test 2: Assignment Deadline Reminders ---');
    // Create an assignment due tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const insHw = await db.query(`
      INSERT INTO homework_assignments 
      (title, description, subject, grade, stream, due_date, due_time, total_marks, teacher_id, school_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      'Phase 7 Test Mechanics Problem Set',
      'Newton Second Law and Momentum problems',
      'Physical Sciences',
      testGrade,
      'General',
      tomorrow,
      '17:00',
      50,
      1731, // teacher ID
      testSchoolId
    ]);
    const hwId = insHw.rows[0].id;
    cleanupIds.assignments.push(hwId);

    // Run in dry-run mode
    const dryRunRes = await gelezaAutomationService.runAssignmentDeadlineReminders({
      schoolId: testSchoolId,
      dueWithinHours: 48,
      dryRun: true
    });
    assert(dryRunRes.assignments_scanned >= 1, 'Dry-run scanned upcoming assignment');
    assert(dryRunRes.missing_submissions_found >= 1, 'Dry-run identified unsubmitted learner');
    assert(dryRunRes.reminders_dispatched === 0, 'Dry-run dispatched 0 real notifications');

    // Run real dispatch
    const realRunRes = await gelezaAutomationService.runAssignmentDeadlineReminders({
      schoolId: testSchoolId,
      dueWithinHours: 48,
      dryRun: false
    });
    assert(realRunRes.reminders_dispatched >= 1, 'Real run dispatched reminder notification(s)');

    // Verify in geleza_automation_logs
    const logCheck = await db.query(
      `SELECT * FROM geleza_automation_logs WHERE job_type = 'assignment_deadline' AND entity_id = $1`,
      [hwId]
    );
    assert(logCheck.rows.length >= 1, 'Recorded dispatch in geleza_automation_logs');
    assert(logCheck.rows[0].title.includes('Physical Sciences'), 'Log contains subject title');
    assert(logCheck.rows[0].message.includes('CAPS Study Tip'), 'Log message includes CAPS study tip');
    cleanupIds.logs.push(...logCheck.rows.map(r => r.id));

    // ----------------------------------------------------
    // TEST 3: Idempotency & Cooldown Enforcement
    // ----------------------------------------------------
    console.log('\n--- Test 3: Idempotency & Cooldown Enforcement ---');
    const repeatRun = await gelezaAutomationService.runAssignmentDeadlineReminders({
      schoolId: testSchoolId,
      dueWithinHours: 48,
      dryRun: false
    });
    assert(repeatRun.skipped_cooldown >= 1, 'Repeat run skipped reminder due to active 20h cooldown');
    assert(repeatRun.reminders_dispatched === 0, 'Zero spam: 0 duplicate notifications dispatched');

    // Bypass cooldown with force=true
    const forceRun = await gelezaAutomationService.runAssignmentDeadlineReminders({
      schoolId: testSchoolId,
      dueWithinHours: 48,
      force: true,
      dryRun: false
    });
    assert(forceRun.reminders_dispatched >= 1, 'Force flag successfully bypassed cooldown when required');

    // ----------------------------------------------------
    // TEST 4: Homework Submission Deduplication
    // ----------------------------------------------------
    console.log('\n--- Test 4: Submission Detection ---');
    // Now simulate learner submitting the assignment
    const subIns = await db.query(`
      INSERT INTO homework_submissions
      (assignment_id, child_id, learner_user_id, status, submitted_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id
    `, [hwId, testChild.id, testChild.learner_user_id, 'submitted']);
    cleanupIds.submissions.push(subIns.rows[0].id);

    // Re-run with force=true
    const postSubmitRun = await gelezaAutomationService.runAssignmentDeadlineReminders({
      schoolId: testSchoolId,
      dueWithinHours: 48,
      force: true,
      dryRun: false
    });
    // For this learner, missing submissions should now be 0
    const matchedForChild = postSubmitRun.details.filter(
      d => d.assignment_id === hwId && d.learner_name.includes(testChild.full_name)
    );
    assert(matchedForChild.length === 0, 'Submitted homework correctly excluded from deadline reminders');

    // ----------------------------------------------------
    // TEST 5: Low Attendance Alert Trigger
    // ----------------------------------------------------
    console.log('\n--- Test 5: Low Attendance Alerts ---');
    // Insert attendance records for child: 1 present, 3 absent over the last 5 days
    const clsCheck = await db.query('SELECT id FROM classes LIMIT 1');
    const validClassId = testChild.class_id || clsCheck.rows[0]?.id || null;
    const today = new Date();
    for (let i = 1; i <= 4; i++) {
      const attDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const status = i === 1 ? 'present' : 'absent';
      const attIns = await db.query(`
        INSERT INTO attendance (child_id, class_id, attendance_date, status, school_id, recorded_by_teacher_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [testChild.id, validClassId, attDate, status, testSchoolId, 1731]);
      cleanupIds.attendance.push(attIns.rows[0].id);
    }

    const attAlertRes = await gelezaAutomationService.runAttendanceAlerts({
      schoolId: testSchoolId,
      daysWindow: 30,
      force: true,
      dryRun: false
    });
    assert(attAlertRes.flagged_learners >= 1, 'Flagged learner with low attendance ratio');
    assert(attAlertRes.alerts_dispatched >= 1, 'Dispatched DBE attendance policy alert to parent/educator');

    // Verify DBE policy message in logs
    const attLog = await db.query(`
      SELECT * FROM geleza_automation_logs 
      WHERE job_type = 'low_attendance' AND child_id = $1 
      ORDER BY dispatched_at DESC LIMIT 1
    `, [testChild.id]);
    assert(attLog.rows.length >= 1, 'Logged attendance alert in geleza_automation_logs');
    assert(attLog.rows[0].message.includes('DBE Policy Notice'), 'Includes DBE attendance policy guidance');
    cleanupIds.logs.push(...attLog.rows.map(r => r.id));

    // Attendance cooldown test
    const repeatAtt = await gelezaAutomationService.runAttendanceAlerts({
      schoolId: testSchoolId,
      daysWindow: 30,
      force: false,
      dryRun: false
    });
    assert(repeatAtt.skipped_cooldown >= 1, 'Attendance alert respects 7-day cooldown window');

    // ----------------------------------------------------
    // TEST 6: Upcoming Exam Briefings
    // ----------------------------------------------------
    console.log('\n--- Test 6: Upcoming Exam Briefings ---');
    const examDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const insEvent = await db.query(`
      INSERT INTO events (title, description, event_date, event_type, grade_target, school_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      'Term 2 Mathematics Mid-Year Examination',
      'Paper 1: Algebra, Functions and Calculus',
      examDate,
      'Exam',
      testGrade,
      testSchoolId
    ]);
    const eventId = insEvent.rows[0].id;
    cleanupIds.events.push(eventId);

    const examRes = await gelezaAutomationService.runUpcomingExamBriefings({
      schoolId: testSchoolId,
      lookaheadDays: 7,
      force: true,
      dryRun: false
    });
    assert(examRes.events_scanned >= 1, 'Scanned upcoming exam event in 7-day window');
    assert(examRes.briefings_dispatched >= 1, 'Dispatched exam revision briefing');

    const examLog = await db.query(`
      SELECT * FROM geleza_automation_logs 
      WHERE job_type = 'exam_briefing' AND entity_id = $1
    `, [eventId]);
    assert(examLog.rows.length >= 1, 'Logged exam briefing in audit table');
    assert(examLog.rows[0].message.includes('Revision Guidelines'), 'Briefing contains CAPS study strategies');
    cleanupIds.logs.push(...examLog.rows.map(r => r.id));

    // ----------------------------------------------------
    // TEST 7: Class Risk Briefing Synthesis
    // ----------------------------------------------------
    console.log('\n--- Test 7: Educator Class Risk Briefing ---');
    const classRes = await db.query('SELECT id FROM classes LIMIT 1');
    if (classRes.rows.length > 0) {
      const clsId = classRes.rows[0].id;
      const briefing = await gelezaAutomationService.synthesizeClassRiskBriefing({ classId: clsId });
      assert(briefing.class_id === clsId, 'Synthesized briefing for class');
      assert(typeof briefing.total_students === 'number', 'Contains total students count');
      assert(briefing.ai_pedagogical_plan.length > 10, 'Generated pedagogical intervention advice');
    }

    // ----------------------------------------------------
    // TEST 8: Background Job Runner Lifecycle & Status
    // ----------------------------------------------------
    console.log('\n--- Test 8: Job Runner Lifecycle & Status ---');
    const jobStatusBefore = gelezaAutomationJob.getJobStatus();
    assert(typeof jobStatusBefore.is_running === 'boolean', 'getJobStatus returns running boolean');

    const runRes = await gelezaAutomationJob.runCycle({
      schoolId: testSchoolId,
      dryRun: true,
      triggeredBy: 'test_suite'
    });
    assert(runRes.success === true, 'gelezaAutomationJob.runCycle executed cleanly');

    const jobStatusAfter = gelezaAutomationJob.getJobStatus();
    assert(jobStatusAfter.last_run_at !== null, 'Job records last_run_at timestamp');
    assert(jobStatusAfter.history_count >= 1, 'Job records execution history item');

    // ----------------------------------------------------
    // TEST 9: Recent Logs Retrieval
    // ----------------------------------------------------
    console.log('\n--- Test 9: Automation Logs API Retrieval ---');
    const recentLogs = await gelezaAutomationService.getRecentLogs({
      schoolId: testSchoolId,
      limit: 10
    });
    assert(Array.isArray(recentLogs), 'getRecentLogs returns an array');
    assert(recentLogs.length >= 1, 'getRecentLogs retrieved recent audit items');
    assert(recentLogs[0].job_type !== undefined, 'Log contains job_type');

  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  } finally {
    // Clean up test records
    console.log('\n--- Cleaning up test records ---');
    if (cleanupIds.submissions.length > 0) {
      await db.query('DELETE FROM homework_submissions WHERE id = ANY($1::int[])', [cleanupIds.submissions]);
    }
    if (cleanupIds.assignments.length > 0) {
      await db.query('DELETE FROM homework_assignments WHERE id = ANY($1::int[])', [cleanupIds.assignments]);
    }
    if (cleanupIds.attendance.length > 0) {
      await db.query('DELETE FROM attendance WHERE id = ANY($1::int[])', [cleanupIds.attendance]);
    }
    if (cleanupIds.events.length > 0) {
      await db.query('DELETE FROM events WHERE id = ANY($1::int[])', [cleanupIds.events]);
    }
    if (cleanupIds.logs.length > 0) {
      await db.query('DELETE FROM geleza_automation_logs WHERE id = ANY($1::int[])', [cleanupIds.logs]);
    }
    console.log('Cleanup finished.');
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
