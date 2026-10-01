/**
 * AI Academic & Career Advisor Service (Option A)
 * Bridges Node.js Express backend with trained Python ML models in ml_models/
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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
  const grade = parseInt(data.grade, 10) || 10;
  const math = Number(data.math_score) || 70;
  const physics = Number(data.physics_score) || Number(data.natural_sciences_score) || 70;
  const biology = Number(data.biology_score) || 70;
  const english = Number(data.english_score) || 75;
  const history = Number(data.history_score) || Number(data.social_sciences_score) || 70;
  const ems = Number(data.ems_score) || Number(data.accounting) || 65;
  const absences = Number(data.absence_days) || 2;
  const studyHours = Number(data.weekly_self_study_hours) || 15;

  const stemAvg = (math + physics + biology) / 3;
  const overallAvg = Math.round((math + physics + biology + english + history) / 5);

  // 1. Career recommendations: strictly for Grade 12 Matric learners
  let topCareers = null;
  if (grade === 12) {
    if (stemAvg >= 80 && biology >= 80) {
      topCareers = [
        { career: 'Doctor', confidence: 78.5 },
        { career: 'Scientist', confidence: 12.3 },
        { career: 'Software Engineer', confidence: 9.2 }
      ];
    } else if (stemAvg >= 75 && math >= 80) {
      topCareers = [
        { career: 'Software Engineer', confidence: 72.0 },
        { career: 'Construction Engineer', confidence: 18.0 },
        { career: 'Banker', confidence: 10.0 }
      ];
    } else if (english >= 75 && history >= 75) {
      topCareers = [
        { career: 'Lawyer', confidence: 68.4 },
        { career: 'Writer', confidence: 21.2 },
        { career: 'Government Officer', confidence: 10.4 }
      ];
    } else {
      topCareers = [
        { career: 'Business Owner', confidence: 55.0 },
        { career: 'Accountant', confidence: 28.0 },
        { career: 'Real Estate Developer', confidence: 17.0 }
      ];
    }
  }

  // 2. Stream selection: strictly for Grade 9 transitioning into Grade 10
  let streamSelection = null;
  if (grade === 9) {
    const scienceSuitability = Math.round((math * 0.5) + (physics * 0.5));
    const commerceSuitability = Math.round((ems * 0.6) + (math * 0.4));
    const humanitiesSuitability = Math.round((english * 0.5) + (history * 0.5));

    const streams = [
      {
        stream: 'Science Stream',
        suitability: scienceSuitability,
        focus: 'STEM, Engineering, Medicine & Environmental Sciences',
        subjects: ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'English FAL', 'Home Language', 'Life Orientation']
      },
      {
        stream: 'Commerce Stream',
        suitability: commerceSuitability,
        focus: 'Accounting, Finance, Economics & Business Leadership',
        subjects: ['Accounting', 'Business Studies', 'Economics', 'Mathematics', 'English FAL', 'Home Language', 'Life Orientation']
      },
      {
        stream: 'Humanities & Tourism Stream',
        suitability: humanitiesSuitability,
        focus: 'Law, Social Sciences, Tourism Management & Media',
        subjects: ['Tourism', 'History', 'Geography', 'Mathematical Literacy', 'English FAL', 'Home Language', 'Life Orientation']
      }
    ];
    streams.sort((a, b) => b.suitability - a.suitability);
    const top = streams[0];

    streamSelection = {
      recommended_stream: top.stream,
      match_percentage: top.suitability,
      recommended_subjects: top.subjects,
      all_streams: streams,
      guidance_summary: `Based on strong aptitude in ${top.stream}, the learner demonstrates optimal academic capability to excel in Grade 10.`
    };
  }

  const isAtRisk = overallAvg < 50 || absences >= 8;
  const riskLevel = overallAvg < 40 || absences >= 10 ? 'High' : (isAtRisk ? 'Moderate' : 'Low');

  return {
    grade,
    career_recommendations: topCareers,
    stream_selection: streamSelection,
    performance_prediction: {
      predicted_overall_score: overallAvg,
      tier: overallAvg >= 80 ? 'Distinction (Level 7)' : (overallAvg >= 50 ? 'Adequate (Level 4 - Bachelor Admission)' : 'Not Achieved (Remediation Required)')
    },
    at_risk_assessment: {
      is_at_risk: isAtRisk,
      risk_probability: isAtRisk ? 82.0 : 12.0,
      risk_level: riskLevel,
      intervention_guidance: isAtRisk 
        ? 'Student requires targeted tutoring in core subjects and attendance monitoring.'
        : 'Student is performing within stable parameters.'
    }
  };
}

/**
 * Predicts continuous exam mark and balanced risk tier using Geleza SA Performance Factor Model
 * @param {Object} studentData
 * @returns {Promise<Object>}
 */
async function predictGelezaPerformance(studentData) {
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

  const scoreDiff = Math.round((adjustedPred.predicted_score - baselinePred.predicted_score) * 10) / 10;
  const tierChanged = baselinePred.risk_tier.id !== adjustedPred.risk_tier.id;

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
  const attendance = Number(data.Attendance) || 75;
  const hours = Number(data.Hours_Studied) || 15;
  const prev = Number(data.Previous_Scores) || 65;
  const estScore = Math.min(100, Math.max(40, Math.round(prev * 0.4 + attendance * 0.35 + hours * 0.7)));
  const band = scoreSupportBand(estScore);
  return {
    predicted_score: estScore,
    risk_tier: {
      id: band.id,
      label: band.label,
      color: band.color,
      badge: band.badge,
      probabilities: {
        priority_support: band.id === 0 ? 100 : 0,
        core_progress: band.id === 1 ? 100 : 0,
        high_achiever: band.id === 2 ? 100 : 0
      }
    },
    actionable_nudges: [
      attendance < 85 ? `Boosting attendance from ${attendance}% to 90%+ is the single highest-impact factor for grade recovery.` : null,
      hours < 20 ? `Increasing weekly study hours from ${hours} to 20+ hrs is projected to raise marks.` : null
    ].filter(Boolean),
    is_fallback: true
  };
}

module.exports = {
  predictStudent,
  predictBatch,
  predictGelezaPerformance,
  predictGelezaBatch,
  simulateGelezaStudyImpact,
  getGelezaModelMetrics,
  scoreSupportBand
};
