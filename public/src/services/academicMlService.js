const fs = require('fs');
const path = require('path');

class AcademicMlService {
  constructor() {
    this.artifactsPath = path.join(__dirname, '../../../models/academic_model_artifacts.json');
    this.modelData = null;
    this.loadModel();
  }

  loadModel() {
    try {
      if (fs.existsSync(this.artifactsPath)) {
        const raw = fs.readFileSync(this.artifactsPath, 'utf8');
        this.modelData = JSON.parse(raw);
        console.log('[AcademicML] Loaded ML model artifacts version', this.modelData.version);
      } else {
        console.warn('[AcademicML] Warning: Model artifacts not found at', this.artifactsPath);
      }
    } catch (err) {
      console.error('[AcademicML] Error loading model artifacts:', err.message);
    }
  }

  /**
   * Helper: Sigmoid activation for probability
   */
  sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Helper: Map continuous score (0-100) to CAPS Achievement Level 1-7
   */
  getCapsLevel(score) {
    const s = Math.max(0, Math.min(100, score));
    if (s >= 80) return { level: 7, label: 'Outstanding Achievement', code: 'L7', color: '#10B981', badge: 'bg-emerald-100 text-emerald-800' };
    if (s >= 70) return { level: 6, label: 'Meritorious Achievement', code: 'L6', color: '#059669', badge: 'bg-teal-100 text-teal-800' };
    if (s >= 60) return { level: 5, label: 'Substantial Achievement', code: 'L5', color: '#3B82F6', badge: 'bg-blue-100 text-blue-800' };
    if (s >= 50) return { level: 4, label: 'Adequate Achievement', code: 'L4', color: '#6366F1', badge: 'bg-indigo-100 text-indigo-800' };
    if (s >= 40) return { level: 3, label: 'Moderate Achievement', code: 'L3', color: '#F59E0B', badge: 'bg-amber-100 text-amber-800' };
    if (s >= 30) return { level: 2, label: 'Elementary Achievement', code: 'L2', color: '#EF4444', badge: 'bg-rose-100 text-rose-800' };
    return { level: 1, label: 'Not Achieved (Critical)', code: 'L1', color: '#DC2626', badge: 'bg-red-200 text-red-900' };
  }

  /**
   * Transform raw learner inputs into the standardized feature vector
   */
  extractFeatureVector(student) {
    if (!this.modelData) {
      this.loadModel();
      if (!this.modelData) throw new Error('ML model artifacts not loaded');
    }

    const { scaler, categorical_mappings } = this.modelData;

    // 1. Numerical scaling
    const rawNum = [
      parseFloat(student.age) || 16,
      parseFloat(student.study_hours_per_week) || 15,
      parseFloat(student.attendance_rate) || 75.0,
      parseFloat(student.previous_score) || 50.0
    ];

    const scaledNum = rawNum.map((val, idx) => (val - scaler.mean[idx]) / scaler.scale[idx]);

    // 2. One-hot encoding for categorical variables
    // gender
    const isMale = (student.gender || '').toLowerCase() === 'male' ? 1 : 0;
    
    // parent_education (categories: Bachelor, High School, Master, None, PhD)
    const parentEdu = (student.parent_education || 'High School');
    const eduHighSchool = parentEdu === 'High School' ? 1 : 0;
    const eduMaster = parentEdu === 'Master' ? 1 : 0;
    const eduNone = parentEdu === 'None' ? 1 : 0;
    const eduPhD = parentEdu === 'PhD' ? 1 : 0;

    // internet_access (Yes = 1, No = 0)
    const hasInternet = (student.internet_access === true || (student.internet_access || '').toLowerCase() === 'yes') ? 1 : 0;

    // extracurricular (Yes = 1, No = 0)
    const hasExtracurricular = (student.extracurricular === true || (student.extracurricular || '').toLowerCase() === 'yes') ? 1 : 0;

    // Vector matching exact feature_names ordering:
    // ['age', 'study_hours_per_week', 'attendance_rate', 'previous_score', 'gender_Male', 'parent_education_High School', 'parent_education_Master', 'parent_education_None', 'parent_education_PhD', 'internet_access_Yes', 'extracurricular_Yes']
    return [
      ...scaledNum,
      isMale,
      eduHighSchool,
      eduMaster,
      eduNone,
      eduPhD,
      hasInternet,
      hasExtracurricular
    ];
  }

  /**
   * Predict single student risk and final mark
   */
  predictStudent(studentData) {
    if (!this.modelData) this.loadModel();
    if (!this.modelData) throw new Error('Model artifacts not available');

    const featureVector = this.extractFeatureVector(studentData);
    const { logistic_regression, linear_regressor, feature_names } = this.modelData;

    // 1. Calculate Classification Logit -> Probability
    let classLogit = logistic_regression.intercept;
    feature_names.forEach((name, i) => {
      const coef = logistic_regression.coefficients[name] || 0;
      classLogit += coef * featureVector[i];
    });
    const passProbability = this.sigmoid(classLogit);
    const passPercentage = Math.round(passProbability * 100);

    // 2. Calculate Continuous Score Regression
    let regScore = linear_regressor.intercept;
    feature_names.forEach((name, i) => {
      const coef = linear_regressor.coefficients[name] || 0;
      regScore += coef * featureVector[i];
    });
    const projectedScore = Math.max(0, Math.min(100, Math.round(regScore)));
    const capsLevel = this.getCapsLevel(projectedScore);

    // 3. Determine Risk Tier
    let riskTier = 'Low';
    let riskColor = '#10B981';
    let riskBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    let riskLabel = 'On Track (Low Risk)';

    if (passPercentage < 50) {
      riskTier = 'High';
      riskColor = '#EF4444';
      riskBadge = 'bg-red-100 text-red-800 border-red-300';
      riskLabel = 'Critical (High Risk of Failure)';
    } else if (passPercentage < 75) {
      riskTier = 'Medium';
      riskColor = '#F59E0B';
      riskBadge = 'bg-amber-100 text-amber-800 border-amber-300';
      riskLabel = 'Moderate Risk (Intervention Advised)';
    }

    // 4. Compute Key Drivers & Interventions
    const attendance = parseFloat(studentData.attendance_rate) || 75;
    const studyHours = parseFloat(studentData.study_hours_per_week) || 15;
    const prevScore = parseFloat(studentData.previous_score) || 50;

    const drivers = [];
    const interventions = [];

    if (studyHours < 12) {
      drivers.push({ factor: 'Weekly Study Hours', impact: 'Negative', detail: `Only logging ${studyHours} hrs/week (benchmark is 18+ hrs)` });
      interventions.push('Increase weekly structured revision & homework to at least 18 hours.');
    } else {
      drivers.push({ factor: 'Study Discipline', impact: 'Positive', detail: `${studyHours} hrs/week active study time` });
    }

    if (attendance < 75) {
      drivers.push({ factor: 'Class Attendance', impact: 'Negative', detail: `${attendance}% attendance creates critical content gaps` });
      interventions.push('Compulsory attendance recovery plan & parent notification alert.');
    } else if (attendance >= 90) {
      drivers.push({ factor: 'Class Attendance', impact: 'Positive', detail: `Excellent attendance rate (${attendance}%)` });
    }

    if (prevScore < 40) {
      drivers.push({ factor: 'Baseline SBA', impact: 'Negative', detail: `Baseline SBA score is below passing threshold (${prevScore}%)` });
      interventions.push('Enroll in subject masterclasses & DBE past exam paper bootcamps.');
    } else if (prevScore >= 70) {
      drivers.push({ factor: 'Baseline SBA', impact: 'Positive', detail: `Strong foundation (${prevScore}%)` });
    }

    if (interventions.length === 0) {
      interventions.push('Maintain current revision routine and participate in timed exam simulations.');
    }

    return {
      student_id: studentData.student_id || 'STU-PROJECTION',
      projected_final_score: projectedScore,
      caps_achievement_level: capsLevel,
      pass_probability: passPercentage,
      risk_tier: riskTier,
      risk_label: riskLabel,
      risk_color: riskColor,
      risk_badge: riskBadge,
      drivers,
      interventions,
      model_meta: {
        accuracy: this.modelData.metrics.classifier.accuracy,
        roc_auc: this.modelData.metrics.classifier.roc_auc,
        r2_score: this.modelData.metrics.regressor.r2_score
      }
    };
  }

  /**
   * Run What-If Simulation
   */
  simulateWhatIf(studentData, adjustments = {}) {
    const baseline = this.predictStudent(studentData);
    const adjustedStudent = {
      ...studentData,
      study_hours_per_week: adjustments.study_hours_per_week !== undefined ? adjustments.study_hours_per_week : studentData.study_hours_per_week,
      attendance_rate: adjustments.attendance_rate !== undefined ? adjustments.attendance_rate : studentData.attendance_rate,
      previous_score: adjustments.previous_score !== undefined ? adjustments.previous_score : studentData.previous_score
    };
    const simulated = this.predictStudent(adjustedStudent);

    const scoreDelta = simulated.projected_final_score - baseline.projected_final_score;
    const probDelta = simulated.pass_probability - baseline.pass_probability;

    return {
      baseline,
      simulated,
      impact: {
        score_delta: scoreDelta,
        score_delta_formatted: (scoreDelta >= 0 ? `+${scoreDelta}` : `${scoreDelta}`) + '%',
        pass_prob_delta: probDelta,
        pass_prob_delta_formatted: (probDelta >= 0 ? `+${probDelta}` : `${probDelta}`) + '%',
        caps_level_improved: simulated.caps_achievement_level.level > baseline.caps_achievement_level.level
      }
    };
  }

  /**
   * Batch prediction for a cohort of students
   */
  predictCohort(students = []) {
    const results = students.map(s => this.predictStudent(s));
    const total = results.length;
    if (total === 0) return { total: 0, summary: {}, students: [] };

    const highRisk = results.filter(r => r.risk_tier === 'High').length;
    const mediumRisk = results.filter(r => r.risk_tier === 'Medium').length;
    const lowRisk = results.filter(r => r.risk_tier === 'Low').length;
    const avgScore = Math.round(results.reduce((acc, r) => acc + r.projected_final_score, 0) / total);
    const projectedPassRate = Math.round((results.filter(r => r.pass_probability >= 50).length / total) * 100);

    return {
      total,
      summary: {
        projected_pass_rate: projectedPassRate,
        average_projected_score: avgScore,
        average_caps_level: this.getCapsLevel(avgScore),
        risk_breakdown: {
          high_risk: highRisk,
          high_risk_pct: Math.round((highRisk / total) * 100),
          medium_risk: mediumRisk,
          medium_risk_pct: Math.round((mediumRisk / total) * 100),
          low_risk: lowRisk,
          low_risk_pct: Math.round((lowRisk / total) * 100)
        }
      },
      feature_importance: this.modelData ? this.modelData.feature_importance : [],
      model_metrics: this.modelData ? this.modelData.metrics : {},
      students: results
    };
  }
}

module.exports = new AcademicMlService();
