const academicMlService = require('../public/src/services/academicMlService');

async function testMlEngine() {
  console.log('--- Testing ML Predictive Engine ---');

  // Test 1: High performing student
  const studentGood = {
    student_id: 'STU-PRO-01',
    age: 18,
    gender: 'Female',
    study_hours_per_week: 26,
    attendance_rate: 94.0,
    parent_education: 'Bachelor',
    internet_access: 'Yes',
    extracurricular: 'Yes',
    previous_score: 75
  };

  const predGood = academicMlService.predictStudent(studentGood);
  console.log('Good Student Prediction:');
  console.log(`  Projected Score: ${predGood.projected_final_score}%`);
  console.log(`  CAPS Level: Level ${predGood.caps_achievement_level.level} (${predGood.caps_achievement_level.label})`);
  console.log(`  Pass Probability: ${predGood.pass_probability}%`);
  console.log(`  Risk Tier: ${predGood.risk_tier}`);

  // Test 2: Low performing student
  const studentAtRisk = {
    student_id: 'STU-PRO-02',
    age: 18,
    gender: 'Male',
    study_hours_per_week: 4,
    attendance_rate: 58.0,
    parent_education: 'None',
    internet_access: 'No',
    extracurricular: 'No',
    previous_score: 35
  };

  const predAtRisk = academicMlService.predictStudent(studentAtRisk);
  console.log('\nAt-Risk Student Prediction:');
  console.log(`  Projected Score: ${predAtRisk.projected_final_score}%`);
  console.log(`  CAPS Level: Level ${predAtRisk.caps_achievement_level.level} (${predAtRisk.caps_achievement_level.label})`);
  console.log(`  Pass Probability: ${predAtRisk.pass_probability}%`);
  console.log(`  Risk Tier: ${predAtRisk.risk_tier}`);
  console.log(`  Interventions: ${predAtRisk.interventions.join('; ')}`);

  // Test 3: What-If simulation
  const whatIf = academicMlService.simulateWhatIf(studentAtRisk, {
    study_hours_per_week: 22,
    attendance_rate: 90
  });
  console.log('\nWhat-If Intervention Simulation on At-Risk Student:');
  console.log(`  Score Boost: ${whatIf.impact.score_delta_formatted}`);
  console.log(`  Pass Probability Gain: ${whatIf.impact.pass_prob_delta_formatted}`);
  console.log(`  New Score: ${whatIf.simulated.projected_final_score}% (Level ${whatIf.simulated.caps_achievement_level.level})`);

  console.log('\n✅ All ML Engine tests completed successfully.');
}

testMlEngine().catch(console.error);
