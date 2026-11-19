/**
 * AI Academic & Career Advisor Service (Option A)
 * Bridges Node.js Express backend with trained Python ML models in ml_models/
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { advisorEvidence, gelezaInputs, unavailablePrediction, observedMarkSummary, finiteNumber } = require('../../../lib/academicEvidence');

const VENV_PYTHON = path.join(__dirname, '..', '..', '..', '.venv', 'Scripts', 'python.exe');
const PYTHON_BIN = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python';

const PREDICT_SCRIPT = path.join(__dirname, '..', '..', '..', 'ml_models', 'src', 'predict.py');
const GELEZA_PREDICT_SCRIPT = path.join(__dirname, '..', '..', '..', 'ml_models', 'src', 'predict_geleza.py');
const GELEZA_METRICS_PATH = path.join(__dirname, '..', '..', '..', 'ml_models', 'reports', 'geleza_models_evaluation.json');

/**
 * Predicts careers, projected score, and at-risk assessment for a single student profile.
 * @param {Object} studentData 
 * @returns {Promise<Object>} AI Advisor results
 */
async function predictStudent(studentData) {
  const source = studentData || {};
  const required = ['math_score', 'physics_score', 'biology_score', 'english_score', 'history_score'];
  const recorded = required
    .map((key) => ({ subject: key, score: finiteNumber(source[key]) }))
    .filter((entry) => entry.score !== null);
  if (recorded.length !== required.length) {
    return unavailablePrediction(
      'A prediction was not produced because the subject marks are incomplete. Missing marks were not replaced.',
      observedMarkSummary(recorded)
    );
  }
  return new Promise((resolve) => {
    try {
      const pythonProcess = spawn(PYTHON_BIN, [PREDICT_SCRIPT, '--stdin'], {
        windowsHide: true
      });

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pythonProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pythonProcess.on('error', (err) => {
        console.warn('[AI Advisor] Process spawn error, using intelligent fallback:', err.message);
        resolve(getFallbackPrediction(studentData));
      });

      pythonProcess.on('close', (code) => {
        if (code === 0 && stdoutData.trim()) {
          try {
            const parsed = JSON.parse(stdoutData.trim());
            return resolve(parsed);
          } catch (e) {
            console.warn('[AI Advisor] JSON parse error from python output:', e.message);
          }
        }
        console.warn(`[AI Advisor] Python exited with code ${code}. Stderr: ${stderrData}`);
        resolve(getFallbackPrediction(studentData));
      });

      // Write payload to stdin
      pythonProcess.stdin.write(JSON.stringify(studentData));
      pythonProcess.stdin.end();

      // Timeout safety (5 seconds)
      setTimeout(() => {
        try {
          pythonProcess.kill();
        } catch (_) {}
        resolve(getFallbackPrediction(studentData));
      }, 5000);

    } catch (err) {
      console.warn('[AI Advisor] Exception invoking predict.py:', err.message);
      resolve(getFallbackPrediction(studentData));
    }
  });
}

/**
 * Batch prediction for an array of learners in one execution.
 * @param {Array<Object>} studentsList 
 * @returns {Promise<Array<Object>>}
 */
async function predictBatch(studentsList) {
  if (!Array.isArray(studentsList) || studentsList.length === 0) return [];
  
  return new Promise((resolve) => {
    try {
      const pythonProcess = spawn('python', [PREDICT_SCRIPT, '--stdin'], {
        windowsHide: true
      });

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pythonProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0 && stdoutData.trim()) {
          try {
            const parsed = JSON.parse(stdoutData.trim());
            return resolve(parsed);
          } catch (e) {}
        }
        // Fallback array
        resolve(studentsList.map(s => getFallbackPrediction(s)));
      });

      pythonProcess.stdin.write(JSON.stringify(studentsList));
      pythonProcess.stdin.end();

      setTimeout(() => {
        try { pythonProcess.kill(); } catch (_) {}
        resolve(studentsList.map(s => getFallbackPrediction(s)));
      }, 10000);

    } catch (_) {
      resolve(studentsList.map(s => getFallbackPrediction(s)));
    }
  });
}

/**
 * Robust fallback aligned with South African CAPS standards
 */
function getFallbackPrediction(data) {
  const evidence = advisorEvidence(data || {});
  const observed = observedMarkSummary(evidence.recorded);
  return unavailablePrediction(
    'The prediction service is unavailable. No estimated marks, careers, or risk scores were created.',
    { recorded_marks: observed.recorded_marks, observed_average: observed.observed_average }
  );
}

async function predictGelezaPerformance(studentData) {
  const inputs = gelezaInputs(studentData || {});
  if (!inputs.complete) {
    return unavailablePrediction(
      'A performance prediction was not produced because attendance, study hours, or marks are missing. Sample values were not used.',
      { missing: inputs.missing }
    );
  }
  return new Promise((resolve) => {
    try {
      const pythonProcess = spawn(PYTHON_BIN, [GELEZA_PREDICT_SCRIPT, '--stdin'], {
        windowsHide: true
      });

      let stdoutData = '';
      let stderrData = '';

      pythonProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      pythonProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      pythonProcess.on('error', (err) => {
        console.warn('[Geleza AI Advisor] Process spawn error, using intelligent fallback:', err.message);
        resolve(getGelezaFallback(studentData));
      });

      pythonProcess.on('close', (code) => {
        if (code === 0 && stdoutData.trim()) {
          try {
            const parsed = JSON.parse(stdoutData.trim());
            return resolve(parsed);
          } catch (e) {
            console.warn('[Geleza AI Advisor] JSON parse error:', e.message);
          }
        }
        console.warn(`[Geleza AI Advisor] Python exited with code ${code}. Stderr: ${stderrData}`);
        resolve(getGelezaFallback(studentData));
      });

      pythonProcess.stdin.write(JSON.stringify(studentData));
      pythonProcess.stdin.end();

      setTimeout(() => {
        try { pythonProcess.kill(); } catch (_) {}
        resolve(getGelezaFallback(studentData));
      }, 5000);

    } catch (err) {
      console.warn('[Geleza AI Advisor] Exception invoking predict_geleza.py:', err.message);
      resolve(getGelezaFallback(studentData));
    }
  });
}

/**
 * Batch prediction for multiple learners
 * @param {Array<Object>} studentsList 
 * @returns {Promise<Array<Object>>}
 */
async function predictGelezaBatch(studentsList) {
  if (!Array.isArray(studentsList) || studentsList.length === 0) return [];
  return new Promise((resolve) => {
    try {
      const pythonProcess = spawn(PYTHON_BIN, [GELEZA_PREDICT_SCRIPT, '--stdin'], {
        windowsHide: true
      });

      let stdoutData = '';
      pythonProcess.stdout.on('data', (chunk) => { stdoutData += chunk.toString(); });
      pythonProcess.on('close', (code) => {
        if (code === 0 && stdoutData.trim()) {
          try {
            const parsed = JSON.parse(stdoutData.trim());
            return resolve(parsed);
          } catch (_) {}
        }
        resolve(studentsList.map(s => getGelezaFallback(s)));
      });

      pythonProcess.stdin.write(JSON.stringify(studentsList));
      pythonProcess.stdin.end();

      setTimeout(() => {
        try { pythonProcess.kill(); } catch (_) {}
        resolve(studentsList.map(s => getGelezaFallback(s)));
      }, 10000);
    } catch (_) {
      resolve(studentsList.map(s => getGelezaFallback(s)));
    }
  });
}

/**
 * What-If Study Simulator: Compares baseline student parameters against simulated improvements
 * @param {Object} baselineData 
 * @param {Object} simulatedAdjustments 
 * @returns {Promise<Object>}
 */
async function simulateGelezaStudyImpact(baselineData, simulatedAdjustments) {
  const adjustedData = { ...baselineData, ...simulatedAdjustments };
  const [baselinePred, adjustedPred] = await Promise.all([
    predictGelezaPerformance(baselineData),
    predictGelezaPerformance(adjustedData)
  ]);

  if (baselinePred.predicted_score == null || adjustedPred.predicted_score == null) {
    return {
      success: false,
      prediction_available: false,
      official_result: false,
      message: 'The comparison was not produced because a recorded baseline or adjustment is missing.'
    };
  }
  const scoreDiff = Math.round((adjustedPred.predicted_score - baselinePred.predicted_score) * 10) / 10;
  const tierChanged = baselinePred.risk_tier && adjustedPred.risk_tier && baselinePred.risk_tier.id !== adjustedPred.risk_tier.id;

  return {
    baseline: baselinePred,
    simulated: adjustedPred,
    impact: {
      score_delta: scoreDiff,
      is_improvement: scoreDiff > 0,
      tier_upgraded: tierChanged && adjustedPred.risk_tier.id > baselinePred.risk_tier.id,
      summary: scoreDiff > 0
        ? `Implementing these habits is projected to raise exam marks by +${scoreDiff}% points.`
        : 'Adjustments yield steady/comparable performance.'
    }
  };
}

/**
 * Fetches cached Geleza model evaluation metrics and confusion matrix
 * @returns {Object}
 */
function getGelezaModelMetrics() {
  try {
    if (fs.existsSync(GELEZA_METRICS_PATH)) {
      const raw = fs.readFileSync(GELEZA_METRICS_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Geleza AI Advisor] Failed to read metrics JSON:', e.message);
  }
  return {
    metadata: { project: "Geleza SA Multi-School Analytics", model_version: "2.0.0", unavailable: true },
    metrics: null
  };
}

/**
 * Live support bands use the predicted mark.
 * Below 50 is priority support, 50–69 is core progress, and 70+ is high achiever.
 */
function scoreSupportBand(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  if (value < 50) {
    return { id: 0, label: 'Priority Support (below 50)', color: 'red', badge: '🔴' };
  }
  if (value < 70) {
    return { id: 1, label: 'Core Progress (50-69)', color: 'green', badge: '🟢' };
  }
  return { id: 2, label: 'High Achiever (70+)', color: 'gold', badge: '🌟' };
}

/**
 * Robust fallback for Geleza student predictions
 */
function getGelezaFallback(data) {
  const inputs = gelezaInputs(data || {});
  return unavailablePrediction(
    'The performance model is unavailable. No estimated mark was created.',
    { missing: inputs.missing, is_fallback: true }
  );
}

module.exports = {
  predictStudent,
  predictBatch,
  predictGelezaPerformance,
  predictGelezaBatch,
  simulateGelezaStudyImpact,
  getGelezaModelMetrics,
  scoreSupportBand,
  getFallbackPrediction
};
