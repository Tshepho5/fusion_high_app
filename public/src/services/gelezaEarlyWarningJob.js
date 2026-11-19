/**
 * Geleza SA AI Early-Warning Background Risk Job
 * 
 * Periodically audits enrolled learners across all schools, evaluates their
 * performance factors against the LightGBM models, identifies students in the
 * Priority Support tier (<=65% projected exam mark or <75% attendance), and
 * automatically dispatches targeted notifications to teachers and school leadership.
 */

const db = require('../../../db/db');
const aiAdvisorService = require('./aiAdvisorService');
const NotificationService = require('./notificationService');
const { decideEarlyWarningAlert, sameSchoolRecipientIds, projectionNotice, periodicAuditPlan } = require('../../../lib/earlyWarningAlert');

class GelezaEarlyWarningJob {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.lastRunAt = null;
    this.lastStats = null;
    this.history = [];
    this.maxHistory = 20;
    this.isSchemaEnsured = false;
  }

  /**
   * Ensures necessary alert audit columns exist on ai_performance_predictions
   */
  async ensureSchema() {
    if (this.isSchemaEnsured) return;
    try {
      await db.query(`
        ALTER TABLE ai_performance_predictions 
        ADD COLUMN IF NOT EXISTS alert_dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

        ALTER TABLE ai_performance_predictions 
        ADD COLUMN IF NOT EXISTS alert_severity VARCHAR(20) DEFAULT NULL;

        CREATE INDEX IF NOT EXISTS idx_ai_predictions_alert_dispatched 
        ON ai_performance_predictions(alert_dispatched_at);
      `);
      this.isSchemaEnsured = true;
      console.log('[GELEZA EARLY-WARNING JOB] Alert audit columns verified.');
    } catch (err) {
      console.warn('[GELEZA EARLY-WARNING JOB] Schema ensure warning:', err.message);
    }
  }

  /**
   * Runs the complete Early-Warning Risk Audit across learners.
   * 
   * @param {Object} options
   * @param {number} [options.schoolId] - Filter by specific school ID (optional)
   * @param {number} [options.grade] - Filter by grade (optional)
   * @param {number} [options.term=1] - Academic term (1-4)
   * @param {number} [options.academicYear=2026] - Academic year
   * @param {boolean} [options.forceAlert=false] - Ignore 7-day alert cooldown
   * @param {boolean} [options.dryRun=false] - Compute without writing to DB or dispatching
   * @returns {Promise<Object>} Execution audit report
   */
  async runRiskAudit(options = {}) {
    const {
      schoolId = null,
      grade = null,
      term = null,
      academicYear = null,
      forceAlert = false,
      dryRun = false,
      triggeredBy = 'automated_cron'
    } = options;

    const termNumber = Number(term);
    const yearNumber = Number(academicYear);
    if (![1, 2, 3, 4].includes(termNumber) || !Number.isInteger(yearNumber) || yearNumber < 2000) {
      return {
        success: false,
        message: 'Choose a term from 1 to 4 and an academic year before running the audit.'
      };
    }

    if (this.isRunning) {
      return {
        success: false,
        message: 'A risk audit is already in progress. Please wait for it to complete.',
        started_at: this.lastRunAt
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    await this.ensureSchema();

    console.log(`[GELEZA EARLY-WARNING JOB] Starting risk audit (schoolId: ${schoolId || 'all'}, grade: ${grade || 'all'}, dryRun: ${dryRun})...`);

    const stats = {
      run_id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      triggered_by: triggeredBy,
      school_id: schoolId,
      grade: grade,
      term,
      academic_year: academicYear,
      total_learners_scanned: 0,
      priority_support_count: 0,
      core_progress_count: 0,
      high_achiever_count: 0,
      alerts_dispatched: 0,
      flagged_learners: [],
      duration_ms: 0
    };

    try {
      // 1. Query enrolled learners with their profiles, schools, and attendance
      let query = `
        SELECT c.id as child_id, c.school_id, c.full_name, c.surname, c.grade, c.class_id,
               c.parent_id, c.learner_number,
               s.school_type,
               cls.homeroom_teacher_id,
               cls.assigned_teacher_id,
               (SELECT COUNT(*) FROM attendance WHERE child_id = c.id) as total_attendance,
               (SELECT COUNT(*) FROM attendance WHERE child_id = c.id AND status = 'present') as present_days,
               prev.risk_tier_id as last_risk_tier,
               prev.predicted_score as last_predicted_score,
               alerts.last_alert_at as last_alert_at
        FROM children c
        LEFT JOIN users u ON c.learner_user_id = u.id
        LEFT JOIN schools s ON c.school_id = s.id
        LEFT JOIN classes cls ON c.class_id = cls.id
        LEFT JOIN LATERAL (
          SELECT risk_tier_id, predicted_score, alert_dispatched_at
          FROM ai_performance_predictions
          WHERE child_id = c.id
          ORDER BY created_at DESC LIMIT 1
        ) prev ON true
        LEFT JOIN LATERAL (
          SELECT MAX(alert_dispatched_at) as last_alert_at
          FROM ai_performance_predictions
          WHERE child_id = c.id AND alert_dispatched_at IS NOT NULL
        ) alerts ON true
        WHERE 1=1
      `;
      const params = [];
      if (schoolId) {
        params.push(schoolId);
        query += ` AND c.school_id = $${params.length}`;
      }
      if (grade) {
        params.push(grade);
        query += ` AND c.grade = $${params.length}`;
      }
      query += ` ORDER BY c.grade ASC, c.surname ASC`;

      const learnersRes = await db.query(query, params);
      const learners = learnersRes.rows;
      stats.total_learners_scanned = learners.length;

      // Query existing school IDs to ensure FK integrity
      const schoolsRes = await db.query('SELECT id FROM schools');
      const validSchoolIds = new Set(schoolsRes.rows.map(r => r.id));

      if (learners.length === 0) {
        console.log('[GELEZA EARLY-WARNING JOB] Zero learners found matching criteria.');
        stats.duration_ms = Date.now() - startTime;
        this.recordRun(stats);
        return { success: true, stats, message: 'No learners found to evaluate.' };
      }

      // 2. Iterate through each learner, compute input factors and run LightGBM model
      for (const learner of learners) {
        const totalAtt = parseInt(learner.total_attendance, 10) || 0;
        const presAtt = parseInt(learner.present_days, 10) || 0;
        const attendancePct = totalAtt > 0 ? Math.round((presAtt / totalAtt) * 100) : null;

        // Fetch recent marks average
        const marksRes = await db.query(
          `SELECT score, max_score, percentage 
           FROM marks 
           WHERE child_id = $1 OR learner_id = $1 
           ORDER BY recorded_at DESC LIMIT 15`,
          [learner.child_id]
        );
        let avgScore = null;
        if (marksRes.rows.length > 0) {
          const pcts = marksRes.rows.map(r => {
            if (r.percentage !== null && r.percentage !== undefined && r.percentage !== '') return Number(r.percentage);
            if (r.score === null || r.score === undefined || r.score === '') return null;
            const max = Number(r.max_score);
            if (!Number.isFinite(Number(r.score)) || !Number.isFinite(max) || max <= 0) return null;
            return Math.round((Number(r.score) / max) * 100);
          }).filter((value) => Number.isFinite(value));
          if (pcts.length > 0) avgScore = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
        }

        // Fetch study habits profile
        const profRes = await db.query(
          `SELECT * FROM learner_performance_profiles WHERE child_id = $1 LIMIT 1`,
          [learner.child_id]
        );
        const prof = profRes.rows[0] || {};

        const recordedHours = Number(prof.weekly_hours_studied);
        if (attendancePct === null || avgScore === null || !Number.isFinite(recordedHours)) {
          stats.skipped_insufficient = (stats.skipped_insufficient || 0) + 1;
          continue;
        }

        const payload = {
          Attendance: attendancePct,
          Hours_Studied: recordedHours,
          Access_to_Resources: prof.access_to_resources || null,
          Previous_Scores: avgScore,
          Parental_Involvement: prof.parental_involvement || null,
          Tutoring_Sessions: Number.isFinite(Number(prof.tutoring_sessions)) ? Number(prof.tutoring_sessions) : null
        };

        const prediction = await aiAdvisorService.predictGelezaPerformance(payload);
        if (!prediction || prediction.prediction_available === false || !prediction.risk_tier) {
          stats.skipped_insufficient = (stats.skipped_insufficient || 0) + 1;
          continue;
        }
        const tierId = prediction.risk_tier.id; // 0: Priority, 1: Core, 2: High

        if (tierId === 0) stats.priority_support_count++;
        else if (tierId === 1) stats.core_progress_count++;
        else if (tierId === 2) stats.high_achiever_count++;

        // 3. Early Warning Trigger Logic
        const alertDecision = decideEarlyWarningAlert({
          predictionAvailable: true,
          riskTierId: tierId,
          predictedScore: prediction.predicted_score,
          attendancePct,
          lastAlertAt: learner.last_alert_at,
          force: forceAlert
        });
        const shouldDispatchAlert = alertDecision.dispatch;

        // 4. Save prediction snapshot (unless dryRun)
        let savedPredictionId = null;
        if (!dryRun) {
          const safeSchoolId = validSchoolIds.has(learner.school_id) ? learner.school_id : null;
          const insertRes = await db.query(
            `INSERT INTO ai_performance_predictions
             (child_id, school_id, academic_year, term, predicted_score, risk_tier_id, 
              risk_tier_label, risk_tier_color, confidence_probabilities, actionable_nudges, 
              features_snapshot, alert_dispatched_at, alert_severity)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING id`,
            [
              learner.child_id,
              safeSchoolId,
              academicYear,
              term,
              prediction.predicted_score,
              prediction.risk_tier.id,
              prediction.risk_tier.label,
              prediction.risk_tier.color,
              JSON.stringify(prediction.risk_tier.probabilities),
              prediction.actionable_nudges,
              JSON.stringify(payload),
              shouldDispatchAlert ? new Date() : null,
              shouldDispatchAlert ? 'HIGH' : null
            ]
          );
          savedPredictionId = insertRes.rows[0]?.id;
        }

        // 5. Dispatch Alert Notifications
        if (shouldDispatchAlert && !dryRun) {
          // Gather recipient educator IDs
          const teacherIds = [learner.homeroom_teacher_id, learner.assigned_teacher_id].filter(Boolean);
          if (learner.class_id) {
            const assignRes = await db.query(
              `SELECT teacher_id FROM teacher_assignments WHERE class_id = $1`,
              [learner.class_id]
            );
            assignRes.rows.forEach(r => teacherIds.push(r.teacher_id));
          }

          let people = [];
          if (teacherIds.length > 0) {
            const usersRes = await db.query(
              `SELECT id, school_id FROM users WHERE id = ANY($1::int[])`,
              [teacherIds]
            );
            people = usersRes.rows;
          }
          let targetUsers = sameSchoolRecipientIds(people, learner.school_id);
          if (targetUsers.length === 0 && learner.school_id) {
            const adminRes = await db.query(
              `SELECT id, school_id FROM users WHERE school_id = $1 AND role IN ('admin', 'principal') LIMIT 3`,
              [learner.school_id]
            );
            targetUsers = sameSchoolRecipientIds(adminRes.rows, learner.school_id);
          }
          if (targetUsers.length > 0) {
            const alertTitle = `Early warning: ${learner.full_name} ${learner.surname} (Grade ${learner.grade})`;
            const alertMessage = `Recorded attendance is ${attendancePct}%. A projection from the recorded inputs is ${prediction.predicted_score}%. ${projectionNotice}`;

            await NotificationService.sendToUsers({
              userIds: targetUsers,
              title: alertTitle,
              message: alertMessage,
              type: 'early_warning',
              targetTab: 'early-warning',
              metadata: {
                child_id: learner.child_id,
                grade: learner.grade,
                predicted_score: prediction.predicted_score,
                risk_tier_id: 0,
                attendance_pct: attendancePct,
                prediction_id: savedPredictionId,
                alert_type: 'academic_risk',
                official_result: false,
                notice: projectionNotice
              },
              sendToMessages: false,
              sendEmail: false
            });

            stats.alerts_dispatched++;
          }

          stats.flagged_learners.push({
            child_id: learner.child_id,
            name: `${learner.full_name} ${learner.surname}`,
            grade: learner.grade,
            predicted_score: prediction.predicted_score,
            attendance: attendancePct,
            nudges: prediction.actionable_nudges,
            notified_users_count: targetUsers.length
          });
        }
      }

      stats.duration_ms = Date.now() - startTime;
      console.log(`[GELEZA EARLY-WARNING JOB] Audit completed in ${stats.duration_ms}ms: ${stats.total_learners_scanned} scanned, ${stats.priority_support_count} priority, ${stats.alerts_dispatched} alerts sent.`);
      this.recordRun(stats);

      return {
        success: true,
        stats
      };
    } catch (err) {
      console.error('[GELEZA EARLY-WARNING JOB] Audit execution error:', err);
      stats.duration_ms = Date.now() - startTime;
      stats.error = err.message;
      this.recordRun(stats);
      return {
        success: false,
        error: err.message,
        stats
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Records execution in memory history
   */
  recordRun(stats) {
    this.lastRunAt = new Date();
    this.lastStats = stats;
    this.history.unshift(stats);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }

  /**
   * Starts periodic timer (default every 24 hours, with 45-second startup grace period)
   */
  startPeriodicRiskAudit(intervalMs = 24 * 60 * 60 * 1000) {
    if (this.timer) {
      clearInterval(this.timer);
    }

    console.log(`[GELEZA EARLY-WARNING JOB] Initializing automated daily background risk audit (interval: ${intervalMs / 1000 / 3600}h)...`);

    this.timer = setInterval(() => {
      const plan = periodicAuditPlan(process.env);
      if (!plan.run) {
        console.warn('[GELEZA EARLY-WARNING JOB] Periodic audit skipped because GELEZA_AUDIT_TERM is not 1, 2, 3, or 4.');
        return;
      }
      this.runRiskAudit({
        term: plan.term,
        academicYear: plan.academicYear,
        triggeredBy: 'periodic_cron'
      }).catch(err => {
        console.warn('[GELEZA EARLY-WARNING JOB] Periodic audit notice:', err.message);
      });
    }, intervalMs);
  }

  /**
   * Stops periodic timer
   */
  stopPeriodicRiskAudit() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[GELEZA EARLY-WARNING JOB] Periodic risk audit stopped.');
    }
  }

  /**
   * Returns current job status and recent history
   */
  getJobStatus() {
    return {
      is_running: this.isRunning,
      last_run_at: this.lastRunAt,
      last_stats: this.lastStats,
      has_active_timer: !!this.timer,
      history_count: this.history.length,
      recent_history: this.history.slice(0, 5)
    };
  }
}

// Export singleton instance
const gelezaEarlyWarningJob = new GelezaEarlyWarningJob();
module.exports = gelezaEarlyWarningJob;
