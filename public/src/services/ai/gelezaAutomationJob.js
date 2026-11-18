/**
 * Geleza SA AI Automation Background Job (Phase 7)
 * 
 * Periodically executes proactive school workflows:
 * - Assignment deadline reminders with CAPS study nudges
 * - Low-attendance alerts under DBE policy
 * - Upcoming exam briefings
 * 
 * Includes concurrency locking, execution history, and manual trigger controls.
 */

const gelezaAutomationService = require('./gelezaAutomationService');

class GelezaAutomationJob {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.lastRunAt = null;
    this.lastStats = null;
    this.history = [];
    this.maxHistory = 20;
  }

  /**
   * Runs an automation cycle with concurrency guard
   * 
   * @param {Object} options
   * @param {boolean} [options.dryRun=false]
   * @param {number} [options.schoolId]
   * @param {string} [options.triggeredBy='automated_cron']
   * @returns {Promise<Object>}
   */
  async runCycle(options = {}) {
    if (this.isRunning) {
      return {
        success: false,
        message: 'An automation cycle is already currently running.',
        started_at: this.lastRunAt
      };
    }

    this.isRunning = true;
    const { triggeredBy = 'automated_cron', ...serviceOpts } = options;

    try {
      console.log(`[GELEZA AUTOMATION JOB] Starting cycle (triggered by: ${triggeredBy})...`);
      const result = await gelezaAutomationService.runFullCycle(serviceOpts);
      
      const stats = {
        run_id: `auto_${Date.now()}`,
        timestamp: new Date().toISOString(),
        triggered_by: triggeredBy,
        ...result
      };

      this.recordRun(stats);
      return { success: true, stats };
    } catch (err) {
      console.error('[GELEZA AUTOMATION JOB] Execution error:', err);
      const errorStats = {
        run_id: `auto_${Date.now()}`,
        timestamp: new Date().toISOString(),
        triggered_by: triggeredBy,
        success: false,
        error: err.message
      };
      this.recordRun(errorStats);
      return { success: false, error: err.message };
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
   * Starts periodic execution (default every 12 hours, with 60-second initial grace period)
   */
  startPeriodicAutomation(intervalMs = 12 * 60 * 60 * 1000) {
    if (this.timer) {
      clearInterval(this.timer);
    }

    console.log(`[GELEZA AUTOMATION JOB] Initializing automated school workflow runner (interval: ${intervalMs / 1000 / 3600}h)...`);

    // Grace delay after server start
    setTimeout(() => {
      this.runCycle({ triggeredBy: 'startup_scheduled' }).catch(err => {
        console.warn('[GELEZA AUTOMATION JOB] Startup cycle notice:', err.message);
      });
    }, 60000);

    // Periodic repeating interval
    this.timer = setInterval(() => {
      this.runCycle({ triggeredBy: 'periodic_cron' }).catch(err => {
        console.warn('[GELEZA AUTOMATION JOB] Periodic cycle notice:', err.message);
      });
    }, intervalMs);
  }

  /**
   * Stops periodic timer
   */
  stopPeriodicAutomation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[GELEZA AUTOMATION JOB] Periodic runner stopped.');
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

const gelezaAutomationJob = new GelezaAutomationJob();
module.exports = gelezaAutomationJob;
