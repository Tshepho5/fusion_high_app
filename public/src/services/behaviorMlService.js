const fs = require('fs');
const path = require('path');

class BehaviorMlService {
  constructor() {
    this.artifactsPath = path.join(__dirname, '../../../models/sa_behavior_model_artifacts.json');
    this.modelData = null;
    this.loadModel();
  }

  loadModel() {
    try {
      if (fs.existsSync(this.artifactsPath)) {
        const raw = fs.readFileSync(this.artifactsPath, 'utf8');
        this.modelData = JSON.parse(raw);
        console.log('[BehaviorML] Loaded Hybrid SA ML model artifacts version:', this.modelData.version);
      } else {
        console.warn('[BehaviorML] Warning: Model artifacts not found at', this.artifactsPath);
      }
    } catch (err) {
      console.error('[BehaviorML] Error loading model artifacts:', err.message);
    }
  }

  /**
   * Helper: Sigmoid activation for classification probability
   */
  sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Helper: Map continuous score (0-100) to CAPS Achievement Level 1-7
   */
  getCapsLevel(score) {
    const s = Math.max(0, Math.min(100, score));
    if (s >= 80) return { level: 7, label: 'Outstanding Achievement', code: 'L7', color: '#10B981', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (s >= 70) return { level: 6, label: 'Meritorious Achievement', code: 'L6', color: '#059669', badge: 'bg-teal-100 text-teal-800 border-teal-300' };
    if (s >= 60) return { level: 5, label: 'Substantial Achievement', code: 'L5', color: '#3B82F6', badge: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (s >= 50) return { level: 4, label: 'Adequate Achievement', code: 'L4', color: '#6366F1', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    if (s >= 40) return { level: 3, label: 'Moderate Achievement', code: 'L3', color: '#F59E0B', badge: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (s >= 30) return { level: 2, label: 'Elementary Achievement', code: 'L2', color: '#EF4444', badge: 'bg-rose-100 text-rose-800 border-rose-300' };
    return { level: 1, label: 'Not Achieved (Critical)', code: 'L1', color: '#DC2626', badge: 'bg-red-200 text-red-900 border-red-400' };
  }

  /**
   * Transform raw learner & subject inputs into the exact 34-feature vector
   */
  extractFeatureVector(student, subjectOverride = null) {
    if (!this.modelData) this.loadModel();
    if (!this.modelData) throw new Error('ML model artifacts not loaded');

    const { scaler, feature_names } = this.modelData;

    // 1. Numerical features scaling
    const classSize = parseFloat(student.class_size) || 35;
    const visResources = parseFloat(student.visited_resources) || 50;
    const announcements = parseFloat(student.announcements_viewed) || 40;
    const discussions = parseFloat(student.discussion_participation) || 40;
    const studyHours = parseFloat(student.weekly_study_hours) || 12;
    const homeworkRate = parseFloat(student.homework_completion_rate) || 65;

    const rawNum = [classSize, visResources, announcements, discussions, studyHours, homeworkRate];
    const scaledNum = rawNum.map((val, idx) => (val - scaler.mean[idx]) / scaler.scale[idx]);

    // 2. Categorical features
    const gender = (student.gender || '').toLowerCase();
    const isMale = gender === 'male' || gender === 'm' ? 1 : 0;

    const grade = student.grade || 'Grade 10';
    const stream = student.stream || 'Science';
    const section = (student.class_section || student.class_name || 'A').toString().toUpperCase().replace(/[^A-Z]/g, '') || 'A';
    const subject = subjectOverride || student.subject || 'Mathematics';
    const semester = student.semester || 'Semester 1';
    const absence = (student.absence_days || '').toLowerCase().includes('above') || student.absence_days === 'Above-7' ? 'Above-7' : 'Under-7';

    // Build the binary mapping dictionary for fast one-hot lookup
    const activeCategories = {
        'gender_Male': isMale,
        [`grade_${grade}`]: 1,
        [`stream_${stream}`]: 1,
        [`class_section_${section}`]: 1,
        [`subject_${subject}`]: 1,
        [`semester_${semester}`]: 1,
        'absence_days_Under-7': absence === 'Under-7' ? 1 : 0
    };

    // Construct feature vector in exact feature_names order
    // (first 6 are numerical, remaining 28 are one-hot encoded)
    const vector = [];
    for (let i = 0; i < 6; i++) {
      vector.push(scaledNum[i]);
    }

    for (let i = 6; i < feature_names.length; i++) {
      const featName = feature_names[i];
      vector.push(activeCategories[featName] === 1 ? 1 : 0);
    }

    return vector;
  }

  /**
   * Unsupervised Learning: Diagnose Learner Behavioral Persona
   */
  diagnosePersona(student) {
    if (!this.modelData) this.loadModel();
    const personas = this.modelData.unsupervised_personas || [];

    const vis = parseFloat(student.visited_resources) || 50;
    const study = parseFloat(student.weekly_study_hours) || 12;
    const hw = parseFloat(student.homework_completion_rate) || 65;
    const isAbove7 = (student.absence_days || '').toLowerCase().includes('above');

    // Rule-based cluster matching against persona benchmarks
    if (isAbove7 && (study < 9 || hw < 50)) {
      return personas.find(p => p.persona_name.includes('Critical Truant')) || personas[3] || personas[0];
    }
    if (study >= 15 && hw >= 75 && vis >= 70) {
      return personas.find(p => p.persona_name.includes('High-Achiever')) || personas[0];
    }
    if (hw >= 60 && study >= 11) {
      return personas.find(p => p.persona_name.includes('Consistent Striver')) || personas[1];
    }
    return personas.find(p => p.persona_name.includes('Passive')) || personas[2] || personas[0];
  }

  /**
   * 1. Single Learner per Subject Prediction (Micro Level)
   */
  predictLearnerSubject(studentData, subjectOverride = null) {
    if (!this.modelData) this.loadModel();
    const featureVector = this.extractFeatureVector(studentData, subjectOverride);
    const { logistic_regression, linear_regressor, feature_names } = this.modelData;

    // A. Supervised Classification (Pass Probability)
    let logit = logistic_regression.intercept;
    feature_names.forEach((name, i) => {
      logit += (logistic_regression.coefficients[name] || 0) * featureVector[i];
    });
    const passProbability = Math.round(this.sigmoid(logit) * 100);

    // B. Supervised Continuous Score Regression
    let rawScore = linear_regressor.intercept;
    feature_names.forEach((name, i) => {
      rawScore += (linear_regressor.coefficients[name] || 0) * featureVector[i];
    });
    const projectedScore = Math.max(5, Math.min(98, Math.round(rawScore)));
    const capsLevel = this.getCapsLevel(projectedScore);

    // C. Risk Tier Classification
    let riskTier = 'Low';
    let riskLabel = 'On Track (Low Risk)';
    let riskColor = '#10B981';
    let riskBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';

    if (passProbability < 50 || projectedScore < 40) {
      riskTier = 'High';
      riskLabel = 'Critical (High Risk of Failure)';
      riskColor = '#DC2626';
      riskBadge = 'bg-red-100 text-red-800 border-red-300';
    } else if (passProbability < 75 || projectedScore < 55) {
      riskTier = 'Medium';
      riskLabel = 'Moderate Risk (Intervention Advised)';
      riskColor = '#F59E0B';
      riskBadge = 'bg-amber-100 text-amber-800 border-amber-300';
    }

    // D. Unsupervised Persona Diagnosis
    const persona = this.diagnosePersona(studentData);

    // E. Drivers & Explanations
    const studyHours = parseFloat(studentData.weekly_study_hours) || 12;
    const hwRate = parseFloat(studentData.homework_completion_rate) || 65;
    const absences = studentData.absence_days || 'Under-7';
    const drivers = [];

    if (absences === 'Above-7') {
      drivers.push({ factor: 'Attendance', impact: 'Negative', detail: 'Chronic absences (>7 days) significantly drag down pass probability.' });
    } else {
      drivers.push({ factor: 'Attendance', impact: 'Positive', detail: 'Healthy attendance pattern logged (<7 days absent).' });
    }

    if (hwRate < 55) {
      drivers.push({ factor: 'Homework Completion', impact: 'Negative', detail: `Low assignment submission (${hwRate}%) creating knowledge gaps.` });
    } else {
      drivers.push({ factor: 'Homework Completion', impact: 'Positive', detail: `Strong assignment submission rate (${hwRate}%).` });
    }

    if (studyHours < 10) {
      drivers.push({ factor: 'Revision Time', impact: 'Negative', detail: `Only logging ${studyHours} hrs/week revision (benchmark is 14+ hrs).` });
    }

    return {
      student_id: studentData.student_id || 'STU-RECORD',
      subject: subjectOverride || studentData.subject || 'Mathematics',
      pass_probability: passProbability,
      projected_final_score: projectedScore,
      caps_level: capsLevel,
      risk_tier: riskTier,
      risk_label: riskLabel,
      risk_color: riskColor,
      risk_badge: riskBadge,
      persona,
      drivers,
      model_meta: {
        accuracy: this.modelData.metrics.classifier.accuracy,
        roc_auc: this.modelData.metrics.classifier.roc_auc,
        r2_score: this.modelData.metrics.regressor.r2_score
      }
    };
  }

  /**
   * 2. Full 7-Subject Matric Profile Aggregator
   */
  predictLearnerFullProfile(studentData, enrolledSubjects = null) {
    // Default 7 subjects based on stream if not provided
    const stream = studentData.stream || 'Science';
    let subjects = enrolledSubjects;
    if (!subjects || subjects.length === 0) {
      if (stream === 'Commerce') {
        subjects = ['English FAL', 'Life Orientation', 'Mathematics', 'Accounting', 'Business Studies', 'Economics', 'Geography'];
      } else if (stream === 'Tourism') {
        subjects = ['English FAL', 'Life Orientation', 'Mathematical Literacy', 'Tourism', 'Geography', 'History', 'Business Studies'];
      } else {
        subjects = ['English FAL', 'Life Orientation', 'Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'Information Technology'];
      }
    }

    const subjectBreakdown = subjects.map(subj => this.predictLearnerSubject(studentData, subj));
    const avgScore = Math.round(subjectBreakdown.reduce((sum, s) => sum + s.projected_final_score, 0) / subjectBreakdown.length);
    const overallCaps = this.getCapsLevel(avgScore);

    // Official South African NSC Matric Endorsement Rules:
    // - Bachelor Degree: >= 50% in 4 subjects + >= 40% in English + >= 30% in others
    // - Diploma: >= 40% in 4 subjects + >= 30% in others
    // - Higher Certificate: >= 40% in English + >= 40% in 2 subjects + >= 30% in others
    const scoresAbove50 = subjectBreakdown.filter(s => s.projected_final_score >= 50).length;
    const scoresAbove40 = subjectBreakdown.filter(s => s.projected_final_score >= 40).length;
    const scoresAbove30 = subjectBreakdown.filter(s => s.projected_final_score >= 30).length;
    const englishScore = subjectBreakdown.find(s => s.subject.includes('English'))?.projected_final_score || 50;

    let matricEndorsement = 'Not Achieved (At Risk of Incomplete)';
    let endorsementColor = '#DC2626';
    let endorsementBadge = 'bg-red-100 text-red-800 border-red-300';

    if (scoresAbove50 >= 4 && englishScore >= 40 && scoresAbove30 >= 6) {
      matricEndorsement = 'Bachelor Degree Pass (University Track)';
      endorsementColor = '#10B981';
      endorsementBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (scoresAbove40 >= 4 && scoresAbove30 >= 6) {
      matricEndorsement = 'Diploma Pass (Technikon / College Track)';
      endorsementColor = '#3B82F6';
      endorsementBadge = 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (englishScore >= 40 && scoresAbove40 >= 2 && scoresAbove30 >= 5) {
      matricEndorsement = 'Higher Certificate Pass';
      endorsementColor = '#F59E0B';
      endorsementBadge = 'bg-amber-100 text-amber-800 border-amber-300';
    }

    // Find bottleneck subject
    const sortedByScore = [...subjectBreakdown].sort((a, b) => a.projected_final_score - b.projected_final_score);
    const bottleneck = sortedByScore[0];

    const persona = this.diagnosePersona(studentData);

    return {
      student_id: studentData.student_id || 'STU-FULL',
      learner_name: studentData.full_name || studentData.name || 'Learner',
      grade: studentData.grade || 'Grade 12',
      stream,
      overall_average: avgScore,
      overall_caps_level: overallCaps,
      matric_endorsement: matricEndorsement,
      endorsement_badge: endorsementBadge,
      endorsement_color: endorsementColor,
      bottleneck_subject: {
        subject: bottleneck.subject,
        projected_score: bottleneck.projected_final_score,
        risk_tier: bottleneck.risk_tier,
        advice: `Focus priority revision on ${bottleneck.subject} to secure matric endorsement.`
      },
      persona,
      subject_breakdown: subjectBreakdown
    };
  }

  /**
   * 3. Class Cohort Prediction (Classroom Environment)
   */
  predictClassCohort(studentsList, classInfo = {}) {
    if (!studentsList || studentsList.length === 0) {
      return { class_name: classInfo.name || 'Class', count: 0, projected_pass_rate: 0 };
    }

    const predictions = studentsList.map(stu => this.predictLearnerSubject({
      ...stu,
      class_size: classInfo.class_size || studentsList.length,
      stream: classInfo.stream || stu.stream
    }));

    const totalStudents = predictions.length;
    const passingCount = predictions.filter(p => p.pass_probability >= 50).length;
    const classPassRate = Math.round((passingCount / totalStudents) * 100);
    const avgScore = Math.round(predictions.reduce((sum, p) => sum + p.projected_final_score, 0) / totalStudents);

    // Gender breakdown in class
    const females = predictions.filter((p, i) => (studentsList[i].gender || '').toLowerCase() === 'female');
    const males = predictions.filter((p, i) => (studentsList[i].gender || '').toLowerCase() === 'male');

    const femalePassRate = females.length > 0 ? Math.round((females.filter(f => f.pass_probability >= 50).length / females.length) * 100) : 0;
    const malePassRate = males.length > 0 ? Math.round((males.filter(m => m.pass_probability >= 50).length / males.length) * 100) : 0;

    // Persona Distribution
    const personaCounts = {};
    predictions.forEach(p => {
      const name = p.persona.persona_name;
      personaCounts[name] = (personaCounts[name] || 0) + 1;
    });

    // Top 5 At-Risk Students
    const atRiskStudents = [...predictions]
      .filter(p => p.risk_tier === 'High')
      .sort((a, b) => a.projected_final_score - b.projected_final_score)
      .slice(0, 5);

    return {
      class_name: classInfo.name || '10A',
      grade: classInfo.grade || 'Grade 10',
      stream: classInfo.stream || 'Science',
      class_size: totalStudents,
      projected_pass_rate: classPassRate,
      average_projected_score: avgScore,
      caps_achievement_level: this.getCapsLevel(avgScore),
      gender_disparity: {
        females_count: females.length,
        female_pass_rate: femalePassRate,
        males_count: males.length,
        male_pass_rate: malePassRate
      },
      persona_distribution: personaCounts,
      critical_at_risk_count: atRiskStudents.length,
      priority_interventions: atRiskStudents
    };
  }

  /**
   * 4. Grade Cohort Prediction (Stream Comparison)
   */
  predictGradeCohort(studentsList, grade = 'Grade 10') {
    const gradeStudents = studentsList.filter(s => s.grade === grade);
    const streams = ['Science', 'Commerce', 'Tourism'];
    const streamBreakdown = {};

    streams.forEach(str => {
      const cohort = gradeStudents.filter(s => s.stream === str);
      if (cohort.length > 0) {
        const preds = cohort.map(s => this.predictLearnerSubject(s));
        const passes = preds.filter(p => p.pass_probability >= 50).length;
        streamBreakdown[str] = {
          total_learners: cohort.length,
          pass_rate: Math.round((passes / cohort.length) * 100),
          avg_score: Math.round(preds.reduce((acc, p) => acc + p.projected_final_score, 0) / cohort.length)
        };
      }
    });

    return {
      grade,
      total_learners: gradeStudents.length,
      stream_breakdown: streamBreakdown
    };
  }

  /**
   * 5. Whole School Executive Overview (Macro Level)
   */
  predictSchoolPerformance(allStudents, schoolName = 'Fusion High School') {
    if (!allStudents || allStudents.length === 0) return null;

    const matricProfiles = allStudents.map(stu => this.predictLearnerFullProfile(stu));
    const total = matricProfiles.length;
    const bachelors = matricProfiles.filter(m => m.matric_endorsement.includes('Bachelor')).length;
    const diplomas = matricProfiles.filter(m => m.matric_endorsement.includes('Diploma')).length;
    const higherCert = matricProfiles.filter(m => m.matric_endorsement.includes('Higher Certificate')).length;
    const passes = bachelors + diplomas + higherCert;

    const overallPassRate = Math.round((passes / total) * 100);
    const bachelorRate = Math.round((bachelors / total) * 100);

    return {
      school_name: schoolName,
      total_enrolled: total,
      projected_matric_pass_rate: overallPassRate,
      bachelor_endorsement_rate: bachelorRate,
      endorsement_breakdown: {
        bachelor_count: bachelors,
        bachelor_percentage: bachelorRate,
        diploma_count: diplomas,
        diploma_percentage: Math.round((diplomas / total) * 100),
        higher_certificate_count: higherCert,
        higher_certificate_percentage: Math.round((higherCert / total) * 100),
        at_risk_count: total - passes,
        at_risk_percentage: Math.round(((total - passes) / total) * 100)
      }
    };
  }

  /**
   * 6. Interactive "What-If" Scenario Simulator
   */
  simulateWhatIf(studentData, adjustments = {}) {
    const baseline = this.predictLearnerSubject(studentData);

    const adjustedData = {
      ...studentData,
      weekly_study_hours: adjustments.weekly_study_hours !== undefined ? adjustments.weekly_study_hours : studentData.weekly_study_hours,
      absence_days: adjustments.absence_days !== undefined ? adjustments.absence_days : studentData.absence_days,
      homework_completion_rate: adjustments.homework_completion_rate !== undefined ? adjustments.homework_completion_rate : studentData.homework_completion_rate,
      visited_resources: adjustments.visited_resources !== undefined ? adjustments.visited_resources : studentData.visited_resources,
      discussion_participation: adjustments.discussion_participation !== undefined ? adjustments.discussion_participation : studentData.discussion_participation
    };

    const simulated = this.predictLearnerSubject(adjustedData);

    return {
      baseline: {
        score: baseline.projected_final_score,
        caps_level: baseline.caps_level,
        pass_probability: baseline.pass_probability,
        persona: baseline.persona.persona_name
      },
      simulated: {
        score: simulated.projected_final_score,
        caps_level: simulated.caps_level,
        pass_probability: simulated.pass_probability,
        persona: simulated.persona.persona_name
      },
      score_gain: simulated.projected_final_score - baseline.projected_final_score,
      probability_gain: simulated.pass_probability - baseline.pass_probability,
      persona_upgraded: baseline.persona.persona_name !== simulated.persona.persona_name,
      recommendation: simulated.persona.recommendation
    };
  }
}

module.exports = new BehaviorMlService();
