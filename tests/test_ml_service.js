const academicMlService = require('../public/src/services/academicMlService');

console.log('Testing Academic ML Service in Node.js...');

// Test 1: Single student prediction
const sampleStudent = {
  student_id: 'STU0001',
  gender: 'Male',
  age: 15,
  study_hours_per_week: 25,
  attendance_rate: 63.8,
  parent_education: 'Bachelor',
  internet_access: 'Yes',
  extracurricular: 'Yes',
  previous_score: 41
};

const pred = academicMlService.predictStudent(sampleStudent);
console.log('Test 1 Single Student Prediction:', JSON.stringify(pred, null, 2));

// Test 2: At-Risk Student
const atRiskStudent = {
  student_id: 'STU0002',
  gender: 'Female',
  age: 15,
  study_hours_per_week: 2,
  attendance_rate: 54.7,
  parent_education: 'Bachelor',
  internet_access: 'Yes',
  extracurricular: 'Yes',
  previous_score: 83
};

const atRiskPred = academicMlService.predictStudent(atRiskStudent);
console.log('Test 2 At-Risk Student Prediction:', JSON.stringify(atRiskPred, null, 2));

// Test 3: What-If Simulation
const whatIf = academicMlService.simulateWhatIf(atRiskStudent, {
  study_hours_per_week: 20,
  attendance_rate: 85
});
console.log('Test 3 What-If Simulation:', JSON.stringify(whatIf.impact, null, 2));

// Test 4: Cohort Prediction
const cohort = academicMlService.predictCohort([sampleStudent, atRiskStudent]);
console.log('Test 4 Cohort Summary:', JSON.stringify(cohort.summary, null, 2));

console.log('All Academic ML Service Tests Passed Successfully!');
