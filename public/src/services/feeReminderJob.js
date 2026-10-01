const applicationController = require('../controller/applicationController');

let timer = null;

function startPeriodicFeeReminders(intervalMs = 24 * 60 * 60 * 1000) {
  if (timer) clearInterval(timer);
  const origin = process.env.APP_URL || 'http://localhost:4000';
  console.log(`[FEE REMINDER JOB] Application-fee reminders run daily (interval: ${intervalMs / 1000 / 3600}h).`);

  setTimeout(() => {
    applicationController.runScheduledFeeReminders(origin).catch((err) => {
      console.warn('[FEE REMINDER JOB] Startup reminder notice:', err.message);
    });
  }, 60000);

  timer = setInterval(() => {
    applicationController.runScheduledFeeReminders(origin).catch((err) => {
      console.warn('[FEE REMINDER JOB] Periodic reminder notice:', err.message);
    });
  }, intervalMs);
}

module.exports = { startPeriodicFeeReminders };
