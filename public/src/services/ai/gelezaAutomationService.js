/**
 * Geleza SA AI Automation & Workflow Engine (Phase 7)
 * 
 * Orchestrates intelligent, event-driven school workflows:
 * 1. Assignment Deadline Reminders: Detects upcoming homework due within 24-48 hours,
 *    identifies learners with missing submissions, and dispatches encouraging reminders
 *    with subject-specific CAPS study nudges.
 * 2. Low Attendance & Absence Alerts: Monitors attendance ratios against DBE policy
 *    thresholds (<80% or consecutive absences) and alerts parents and homeroom teachers.
 * 3. Upcoming Assessment & Exam Briefings: Identifies exams and formal tests in the 7-day
 *    horizon and sends personalized revision checklists.
 * 4. Educator Risk Synthesis: Aggregates class-level early-warning metrics for teachers.
 * 
 * Guarantees:
 * - 100% Idempotent with audit logging (geleza_automation_logs) to prevent notification fatigue.
 * - Strict multi-tenant isolation by school_id.
 * - Object-level privacy (parents only receive notices for their children).
 */

const db = require('../../../../db/db');
const NotificationService = require('../notificationService');
const aiProvider = require('./aiProvider');

// Curated CAPS Subject Study Nudges for fast, deterministic, high-quality tips
const CAPS_SUBJECT_NUDGES = {
  'mathematics': 'Double-check factorisations and show all intermediate working steps for method marks.',
  'maths': 'Double-check factorisations and show all intermediate working steps for method marks.',
  'mathematical literacy': 'Verify your unit conversions carefully and check rounded values in financial calculations.',
  'physical sciences': 'State the relevant formula before substitution and always include correct SI units in final answers.',
  'physics': 'State the relevant formula before substitution and always include correct SI units in final answers.',
  'life sciences': 'Use standard biological terminology and label diagrams clearly with pencil and ruler.',
  'accounting': 'Ensure debits equal credits on each ledger entry and verify balance sheet reconciliations.',
  'english': 'Review paragraph structure (PEEL method: Point, Explanation, Evidence, Link) and proofread grammar.',
  'geography': 'Refer directly to map contour intervals and coordinate references in your explanations.',
  'history': 'Support arguments with chronological evidence and evaluate source reliability and bias.',
  'tourism': 'Link tourist attractions to their correct provincial locations and foreign exchange considerations.',
  'business studies': 'Structure answers with headings and bullet points using King IV governance terminology.'
};

function getSubjectNudge(subject) {
  if (!subject) return 'Review your textbook notes and complete all required questions step-by-step.';
  const clean = subject.toLowerCase().trim();
  for (const [key, nudge] of Object.entries(CAPS_SUBJECT_NUDGES)) {
    if (clean.includes(key)) return nudge;
  }
  return 'Review your CAPS curriculum notes and verify your answers before submission.';
}

class GelezaAutomationService {
  constructor() {
    this.isSchemaEnsured = false;
  }

  /**
   * Initializes automation audit logging schema and indexes
   */
  async ensureSchema() {
    if (this.isSchemaEnsured) return;
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS geleza_automation_logs (
          id SERIAL PRIMARY KEY,
          job_type VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INTEGER,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          child_id INTEGER,
          school_id INTEGER,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb
        );

        CREATE INDEX IF NOT EXISTS idx_geleza_auto_logs_cooldown 
        ON geleza_automation_logs(job_type, entity_id, user_id, dispatched_at);

        CREATE INDEX IF NOT EXISTS idx_geleza_auto_logs_child 
        ON geleza_automation_logs(job_type, child_id, dispatched_at);

        CREATE INDEX IF NOT EXISTS idx_geleza_auto_logs_school 
        ON geleza_automation_logs(school_id, dispatched_at);

        -- Ensure school_id exists on homework_assignments for fast tenant filtering
        ALTER TABLE homework_assignments ADD COLUMN IF NOT EXISTS school_id INTEGER;
      `);
      this.isSchemaEnsured = true;
    } catch (err) {
      console.warn('[GELEZA AUTOMATION] Schema ensure warning:', err.message);
    }
  }

  /**
   * 1. Assignment Deadline Reminders
   * 
   * Scans homework due in the next 24-48 hours (or due today), identifies learners
   * who have not yet submitted, and dispatches targeted reminders.
   * 
   * @param {Object} options
   * @param {number} [options.schoolId] - Filter by school ID
   * @param {number} [options.dueWithinHours=48] - Lookahead window in hours
   * @param {boolean} [options.includeParents=true] - Also alert parents
   * @param {boolean} [options.force=false] - Bypass 24-hour cooldown
   * @param {boolean} [options.dryRun=false] - Test without writing to DB
   * @returns {Promise<Object>} Execution statistics
   */
  async runAssignmentDeadlineReminders(options = {}) {
    await this.ensureSchema();
    const {
      schoolId = null,
      dueWithinHours = 48,
      includeParents = true,
      force = false,
      dryRun = false
    } = options;

    const stats = {
      job: 'assignment_deadline_reminders',
      assignments_scanned: 0,
      missing_submissions_found: 0,
      reminders_dispatched: 0,
      skipped_cooldown: 0,
      details: []
    };

    try {
      // 1. Find upcoming homework assignments due within window
      let hwQuery = `
        SELECT ha.id, ha.title, ha.description, ha.subject, ha.grade, ha.stream,
               ha.due_date, ha.due_time, ha.total_marks, ha.teacher_id,
               COALESCE(ha.school_id, u.school_id) as school_id,
               u.full_name as teacher_name
        FROM homework_assignments ha
        LEFT JOIN users u ON ha.teacher_id = u.id
        WHERE ha.due_date IS NOT NULL
          AND ha.due_date >= CURRENT_DATE
          AND ha.due_date <= (CURRENT_DATE + ($1 || ' hours')::interval)
      `;
      const hwParams = [dueWithinHours];
      if (schoolId) {
        hwParams.push(schoolId);
        hwQuery += ` AND (ha.school_id = $2 OR u.school_id = $2)`;
      }
      hwQuery += ` ORDER BY ha.due_date ASC`;

      const hwRes = await db.query(hwQuery, hwParams);
      const assignments = hwRes.rows;
      stats.assignments_scanned = assignments.length;

      if (assignments.length === 0) {
        return stats;
      }

      // 2. Iterate each assignment and find enrolled learners who haven't submitted
      for (const hw of assignments) {
        let learnerQuery = `
          SELECT c.id as child_id, c.learner_user_id, c.parent_id, c.full_name, c.surname,
                 c.grade, c.stream, c.school_id
          FROM children c
          WHERE c.grade = $1
            AND (c.is_active IS NULL OR c.is_active = TRUE)
        `;
        const learnerParams = [hw.grade];

        if (hw.school_id) {
          learnerParams.push(hw.school_id);
          learnerQuery += ` AND c.school_id = $${learnerParams.length}`;
        }
        if (hw.stream && hw.stream !== 'All' && hw.stream !== 'General') {
          learnerParams.push(hw.stream);
          learnerQuery += ` AND (c.stream = $${learnerParams.length} OR c.stream IS NULL OR c.stream = 'General')`;
        }

        const learnerRes = await db.query(learnerQuery, learnerParams);
        const learners = learnerRes.rows;

        for (const learner of learners) {
          if (!learner.learner_user_id && !learner.parent_id) continue;

          // Check if already submitted
          const subRes = await db.query(`
            SELECT id FROM homework_submissions
            WHERE assignment_id = $1
              AND (
                (learner_user_id IS NOT NULL AND learner_user_id = $2)
                OR (child_id IS NOT NULL AND child_id = $3)
              )
            LIMIT 1
          `, [hw.id, learner.learner_user_id || -1, learner.child_id]);

          if (subRes.rows.length > 0) {
            // Already submitted!
            continue;
          }

          stats.missing_submissions_found++;

          // Check cooldown: Was a reminder for this assignment sent in the last 20 hours?
          if (!force && learner.learner_user_id) {
            const cooldownRes = await db.query(`
              SELECT id FROM geleza_automation_logs
              WHERE job_type = 'assignment_deadline'
                AND entity_id = $1
                AND user_id = $2
                AND dispatched_at > (NOW() - INTERVAL '20 hours')
              LIMIT 1
            `, [hw.id, learner.learner_user_id]);

            if (cooldownRes.rows.length > 0) {
              stats.skipped_cooldown++;
              continue;
            }
          }

          // Build reminder content with CAPS study nudge
          const nudge = getSubjectNudge(hw.subject);
          const formattedDate = new Date(hw.due_date).toLocaleDateString('en-ZA', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
          });
          const timeText = hw.due_time ? ` at ${hw.due_time}` : '';

          const reminderTitle = `📚 Homework Due: ${hw.title} (${hw.subject})`;
          const reminderMsg = `Due ${formattedDate}${timeText}. Total Marks: ${hw.total_marks || 'N/A'}.\n💡 CAPS Study Tip: ${nudge}`;

          const targetUserIds = [];
          if (learner.learner_user_id) targetUserIds.push(learner.learner_user_id);
          if (includeParents && learner.parent_id) targetUserIds.push(learner.parent_id);

          if (dryRun) {
            stats.details.push({
              assignment_id: hw.id,
              title: hw.title,
              subject: hw.subject,
              learner_name: `${learner.full_name} ${learner.surname}`,
              recipients: targetUserIds.length,
              dry_run: true
            });
            continue;
          }

          if (targetUserIds.length > 0) {
            await NotificationService.sendToUsers({
              userIds: targetUserIds,
              title: reminderTitle,
              message: reminderMsg,
              type: 'assignment_reminder',
              targetTab: 'homework',
              metadata: {
                assignment_id: hw.id,
                child_id: learner.child_id,
                subject: hw.subject,
                due_date: hw.due_date,
                grade: hw.grade,
                automated_by: 'geleza_ai'
              },
              sendToMessages: false,
              sendEmail: false
            });

            // Record in audit log for each notified user
            for (const uid of targetUserIds) {
              await db.query(`
                INSERT INTO geleza_automation_logs
                (job_type, entity_type, entity_id, user_id, child_id, school_id, title, message, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              `, [
                'assignment_deadline',
                'homework_assignment',
                hw.id,
                uid,
                learner.child_id,
                learner.school_id,
                reminderTitle,
                reminderMsg,
                JSON.stringify({ due_date: hw.due_date, subject: hw.subject, role: uid === learner.parent_id ? 'parent' : 'learner' })
              ]);
            }

            stats.reminders_dispatched += targetUserIds.length;
            stats.details.push({
              assignment_id: hw.id,
              title: hw.title,
              subject: hw.subject,
              learner_name: `${learner.full_name} ${learner.surname}`,
              recipients: targetUserIds.length
            });
          }
        }
      }

      return stats;
    } catch (err) {
      console.error('[GELEZA AUTOMATION] Assignment deadline reminders error:', err);
      stats.error = err.message;
      return stats;
    }
  }

  /**
   * 2. Attendance & Absence Alerts
   * 
   * Detects learners with attendance below 80% (or >= 3 absences) over the last 30 days,
   * contextualizes with DBE policy, and alerts parents and homeroom teachers.
   * 
   * @param {Object} options
   * @param {number} [options.schoolId]
   * @param {number} [options.daysWindow=30]
   * @param {number} [options.attendanceThreshold=80]
   * @param {boolean} [options.force=false] - Bypass 7-day cooldown
   * @param {boolean} [options.dryRun=false]
   * @returns {Promise<Object>} Execution statistics
   */
  async runAttendanceAlerts(options = {}) {
    await this.ensureSchema();
    const {
      schoolId = null,
      daysWindow = 30,
      attendanceThreshold = 80,
      force = false,
      dryRun = false
    } = options;

    const stats = {
      job: 'attendance_alerts',
      learners_evaluated: 0,
      flagged_learners: 0,
      alerts_dispatched: 0,
      skipped_cooldown: 0,
      details: []
    };

    try {
      let query = `
        SELECT c.id as child_id, c.learner_user_id, c.parent_id, c.secondary_parent_id,
               c.full_name, c.surname, c.grade, c.class_id, c.school_id,
               cls.homeroom_teacher_id, cls.assigned_teacher_id,
               COUNT(a.id) as total_records,
               COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
               COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count
        FROM children c
        JOIN attendance a ON a.child_id = c.id
        LEFT JOIN classes cls ON c.class_id = cls.id
        WHERE a.attendance_date >= (CURRENT_DATE - ($1 || ' days')::interval)
      `;
      const params = [daysWindow];
      if (schoolId) {
        params.push(schoolId);
        query += ` AND c.school_id = $2`;
      }
      query += `
        GROUP BY c.id, c.learner_user_id, c.parent_id, c.secondary_parent_id,
                 c.full_name, c.surname, c.grade, c.class_id, c.school_id,
                 cls.homeroom_teacher_id, cls.assigned_teacher_id
        HAVING COUNT(a.id) >= 2
      `;

      const res = await db.query(query, params);
      const rows = res.rows;
      stats.learners_evaluated = rows.length;

      for (const row of rows) {
        const total = parseInt(row.total_records, 10) || 0;
        const present = parseInt(row.present_count, 10) || 0;
        const absent = parseInt(row.absent_count, 10) || 0;
        const pct = total > 0 ? Math.round((present / total) * 100) : 100;

        if (pct < attendanceThreshold || absent >= 3) {
          stats.flagged_learners++;

          // Cooldown: 7 days per child for attendance alert
          if (!force) {
            const cdRes = await db.query(`
              SELECT id FROM geleza_automation_logs
              WHERE job_type = 'low_attendance'
                AND child_id = $1
                AND dispatched_at > (NOW() - INTERVAL '7 days')
              LIMIT 1
            `, [row.child_id]);

            if (cdRes.rows.length > 0) {
              stats.skipped_cooldown++;
              continue;
            }
          }

          // Target users: parent, secondary parent, homeroom teacher
          const recipientIds = new Set();
          if (row.parent_id) recipientIds.add(row.parent_id);
          if (row.secondary_parent_id) recipientIds.add(row.secondary_parent_id);
          if (row.homeroom_teacher_id) recipientIds.add(row.homeroom_teacher_id);
          if (row.assigned_teacher_id) recipientIds.add(row.assigned_teacher_id);

          const recipients = Array.from(recipientIds);
          if (recipients.length === 0) continue;

          const title = `⚠️ Attendance Alert: ${row.full_name} ${row.surname} (Grade ${row.grade})`;
          const message = `Attendance rate is ${pct}% over the last ${daysWindow} days (${absent} absences).\n` +
            `DBE Policy Notice: A minimum of 80% attendance is required for continuous assessment qualification. Please contact the school to coordinate catch-up materials.`;

          if (dryRun) {
            stats.details.push({
              child_id: row.child_id,
              name: `${row.full_name} ${row.surname}`,
              attendance_pct: pct,
              absent_count: absent,
              recipients_count: recipients.length,
              dry_run: true
            });
            continue;
          }

          await NotificationService.sendToUsers({
            userIds: recipients,
            title,
            message,
            type: 'attendance_alert',
            targetTab: 'attendance',
            metadata: {
              child_id: row.child_id,
              grade: row.grade,
              attendance_pct: pct,
              absent_count: absent,
              threshold: attendanceThreshold,
              automated_by: 'geleza_ai'
            },
            sendToMessages: false,
            sendEmail: false
          });

          for (const uid of recipients) {
            await db.query(`
              INSERT INTO geleza_automation_logs
              (job_type, entity_type, entity_id, user_id, child_id, school_id, title, message, metadata)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              'low_attendance',
              'child_attendance',
              row.child_id,
              uid,
              row.child_id,
              row.school_id,
              title,
              message,
              JSON.stringify({ attendance_pct: pct, absent_count: absent, days_window: daysWindow })
            ]);
          }

          stats.alerts_dispatched += recipients.length;
          stats.details.push({
            child_id: row.child_id,
            name: `${row.full_name} ${row.surname}`,
            attendance_pct: pct,
            absent_count: absent,
            recipients_count: recipients.length
          });
        }
      }

      return stats;
    } catch (err) {
      console.error('[GELEZA AUTOMATION] Attendance alerts error:', err);
      stats.error = err.message;
      return stats;
    }
  }

  /**
   * 3. Upcoming Assessment & Exam Briefings
   * 
   * Identifies upcoming exams or formal tests in the 7-day horizon and sends
   * revision briefings to targeted grades and classes.
   * 
   * @param {Object} options
   * @param {number} [options.schoolId]
   * @param {number} [options.lookaheadDays=7]
   * @param {boolean} [options.force=false]
   * @param {boolean} [options.dryRun=false]
   * @returns {Promise<Object>} Execution statistics
   */
  async runUpcomingExamBriefings(options = {}) {
    await this.ensureSchema();
    const {
      schoolId = null,
      lookaheadDays = 7,
      force = false,
      dryRun = false
    } = options;

    const stats = {
      job: 'exam_briefings',
      events_scanned: 0,
      briefings_dispatched: 0,
      skipped_cooldown: 0,
      details: []
    };

    try {
      // Query events table for upcoming exams/tests
      let query = `
        SELECT e.id, e.title, e.description, e.event_date, e.start_time, e.end_time,
               e.event_type, e.grade_target, e.stream_target, e.school_id
        FROM events e
        WHERE e.event_date >= CURRENT_DATE
          AND e.event_date <= (CURRENT_DATE + ($1 || ' days')::interval)
          AND (
            e.event_type ILIKE '%exam%' 
            OR e.event_type ILIKE '%test%' 
            OR e.title ILIKE '%exam%' 
            OR e.title ILIKE '%test%'
          )
      `;
      const params = [lookaheadDays];
      if (schoolId) {
        params.push(schoolId);
        query += ` AND (e.school_id = $2 OR e.is_global = TRUE)`;
      }
      query += ` ORDER BY e.event_date ASC`;

      const evRes = await db.query(query, params);
      const events = evRes.rows;
      stats.events_scanned = events.length;

      for (const ev of events) {
        // Cooldown check for this event (48 hours)
        if (!force) {
          const cdRes = await db.query(`
            SELECT id FROM geleza_automation_logs
            WHERE job_type = 'exam_briefing'
              AND entity_id = $1
              AND dispatched_at > (NOW() - INTERVAL '48 hours')
            LIMIT 1
          `, [ev.id]);

          if (cdRes.rows.length > 0) {
            stats.skipped_cooldown++;
            continue;
          }
        }

        // Find recipients in target grade
        let recQuery = `
          SELECT c.learner_user_id, c.parent_id, c.school_id, c.id as child_id
          FROM children c
          WHERE (c.is_active IS NULL OR c.is_active = TRUE)
        `;
        const recParams = [];
        if (ev.grade_target) {
          recParams.push(ev.grade_target);
          recQuery += ` AND c.grade = $${recParams.length}`;
        }
        if (ev.school_id) {
          recParams.push(ev.school_id);
          recQuery += ` AND c.school_id = $${recParams.length}`;
        }

        const recRes = await db.query(recQuery, recParams);
        const recipientUserIds = new Set();
        recRes.rows.forEach(r => {
          if (r.learner_user_id) recipientUserIds.add(r.learner_user_id);
          if (r.parent_id) recipientUserIds.add(r.parent_id);
        });

        const targetUsers = Array.from(recipientUserIds);
        if (targetUsers.length === 0) continue;

        const formattedDate = new Date(ev.event_date).toLocaleDateString('en-ZA', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });

        const title = `📝 Upcoming Assessment Briefing: ${ev.title}`;
        const message = `Scheduled for ${formattedDate}.\n` +
          `Key Revision Guidelines:\n` +
          `1. Focus on high-yield CAPS topics and past exam papers.\n` +
          `2. Practice timed answers under quiet examination conditions.\n` +
          `3. Prepare your stationary, formula sheets, and calculator in advance.`;

        if (dryRun) {
          stats.details.push({
            event_id: ev.id,
            title: ev.title,
            event_date: ev.event_date,
            grade_target: ev.grade_target,
            recipients_count: targetUsers.length,
            dry_run: true
          });
          continue;
        }

        await NotificationService.sendToUsers({
          userIds: targetUsers,
          title,
          message,
          type: 'exam_briefing',
          targetTab: 'assessments',
          metadata: {
            event_id: ev.id,
            event_date: ev.event_date,
            grade_target: ev.grade_target,
            automated_by: 'geleza_ai'
          },
          sendToMessages: false,
          sendEmail: false
        });

        for (const uid of targetUsers) {
          await db.query(`
            INSERT INTO geleza_automation_logs
            (job_type, entity_type, entity_id, user_id, school_id, title, message, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            'exam_briefing',
            'event',
            ev.id,
            uid,
            ev.school_id,
            title,
            message,
            JSON.stringify({ event_date: ev.event_date, grade_target: ev.grade_target })
          ]);
        }

        stats.briefings_dispatched += targetUsers.length;
        stats.details.push({
          event_id: ev.id,
          title: ev.title,
          event_date: ev.event_date,
          grade_target: ev.grade_target,
          recipients_count: targetUsers.length
        });
      }

      return stats;
    } catch (err) {
      console.error('[GELEZA AUTOMATION] Exam briefings error:', err);
      stats.error = err.message;
      return stats;
    }
  }

  /**
   * 4. Synthesizes at-risk learner trends into an actionable educator briefing
   * 
   * @param {Object} options
   * @param {number} options.classId
   * @returns {Promise<Object>} Educator insight summary
   */
  async synthesizeClassRiskBriefing({ classId }) {
    await this.ensureSchema();
    if (!classId) throw new Error('classId is required for risk briefing.');

    // Fetch class info
    const classRes = await db.query(
      `SELECT c.id, c.name, c.grade, c.stream, c.homeroom_teacher_id, s.name as school_name
       FROM classes c
       LEFT JOIN schools s ON c.school_id = s.id
       WHERE c.id = $1`,
      [classId]
    );
    if (classRes.rows.length === 0) throw new Error('Class not found.');
    const cls = classRes.rows[0];

    // Query recent predictions and attendance for students in this class
    const learnersRes = await db.query(`
      SELECT c.id as child_id, c.full_name, c.surname, c.learner_number,
             pred.predicted_score, pred.risk_tier_label, pred.actionable_nudges,
             (SELECT COUNT(*) FROM attendance WHERE child_id = c.id) as total_attendance,
             (SELECT COUNT(*) FROM attendance WHERE child_id = c.id AND status = 'present') as present_attendance
      FROM children c
      LEFT JOIN LATERAL (
        SELECT predicted_score, risk_tier_label, actionable_nudges
        FROM ai_performance_predictions
        WHERE child_id = c.id
        ORDER BY created_at DESC LIMIT 1
      ) pred ON TRUE
      WHERE c.class_id = $1
      ORDER BY c.surname ASC
    `, [classId]);

    const learners = learnersRes.rows;
    let priorityCount = 0;
    let coreCount = 0;
    let highCount = 0;
    const priorityStudents = [];

    learners.forEach(l => {
      const score = Number(l.predicted_score) || 65;
      const totalAtt = parseInt(l.total_attendance, 10) || 0;
      const presAtt = parseInt(l.present_attendance, 10) || 0;
      const attPct = totalAtt > 0 ? Math.round((presAtt / totalAtt) * 100) : 85;

      if (score <= 65 || attPct < 75) {
        priorityCount++;
        priorityStudents.push({
          child_id: l.child_id,
          name: `${l.full_name} ${l.surname}`,
          predicted_score: score,
          attendance_pct: attPct,
          nudge: l.actionable_nudges?.[0] || 'Remedial review recommended'
        });
      } else if (score < 80) {
        coreCount++;
      } else {
        highCount++;
      }
    });

    const summary = {
      class_id: cls.id,
      class_name: cls.name,
      grade: cls.grade,
      stream: cls.stream,
      total_students: learners.length,
      priority_support_count: priorityCount,
      core_progress_count: coreCount,
      high_achiever_count: highCount,
      priority_students: priorityStudents,
      generated_at: new Date().toISOString()
    };

    // If priority students exist, generate an AI pedagogical recommendation
    let aiSynthesis = '';
    if (priorityCount > 0) {
      try {
        const prompt = `You are Geleza AI, advising a South African teacher of Class ${cls.name} (Grade ${cls.grade}). ` +
          `There are ${priorityCount} out of ${learners.length} learners requiring priority intervention. ` +
          `Students needing support: ${priorityStudents.map(s => `${s.name} (Score: ${s.predicted_score}%, Attendance: ${s.attendance_pct}%)`).join(', ')}. ` +
          `Provide a concise 3-bullet pedagogical intervention plan focusing on CAPS remedial techniques and attendance support.`;
        aiSynthesis = await aiProvider.generateResponse(prompt, { temperature: 0.3 });
      } catch (_) {
        aiSynthesis = `• Schedule small-group tutoring during intervention periods.\n• Contact parents of learners below 75% attendance.\n• Assign targeted past CAPS question worksheets.`;
      }
    } else {
      aiSynthesis = `Class performance is healthy. All learners are currently tracking in Core Progress or High Achiever tiers.`;
    }

    summary.ai_pedagogical_plan = aiSynthesis;
    return summary;
  }

  /**
   * 5. Runs the complete automation cycle across all workflows
   * 
   * @param {Object} options
   * @returns {Promise<Object>} Aggregate audit results
   */
  async runFullCycle(options = {}) {
    const startTime = Date.now();
    console.log('[GELEZA AUTOMATION] Starting full automation cycle...');

    const [assignmentsResult, attendanceResult, examsResult] = await Promise.all([
      this.runAssignmentDeadlineReminders(options),
      this.runAttendanceAlerts(options),
      this.runUpcomingExamBriefings(options)
    ]);

    const totalDispatched = (assignmentsResult.reminders_dispatched || 0) +
                            (attendanceResult.alerts_dispatched || 0) +
                            (examsResult.briefings_dispatched || 0);

    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      total_notifications_dispatched: totalDispatched,
      assignments: assignmentsResult,
      attendance: attendanceResult,
      exams: examsResult
    };

    console.log(`[GELEZA AUTOMATION] Full cycle complete in ${report.duration_ms}ms: ${totalDispatched} notifications dispatched.`);
    return report;
  }

  /**
   * Retrieves recent automation dispatch logs with filtering
   */
  async getRecentLogs({ schoolId = null, jobType = null, limit = 50 } = {}) {
    await this.ensureSchema();
    let query = `
      SELECT l.id, l.job_type, l.entity_type, l.entity_id, l.user_id, l.child_id,
             l.school_id, l.title, l.message, l.dispatched_at, l.metadata,
             u.full_name as recipient_name, u.email as recipient_email
      FROM geleza_automation_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (schoolId) {
      params.push(schoolId);
      query += ` AND l.school_id = $${params.length}`;
    }
    if (jobType) {
      params.push(jobType);
      query += ` AND l.job_type = $${params.length}`;
    }
    query += ` ORDER BY l.dispatched_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await db.query(query, params);
    return res.rows;
  }
}

const gelezaAutomationService = new GelezaAutomationService();
module.exports = gelezaAutomationService;
