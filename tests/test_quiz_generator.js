const ai = require('../public/src/services/aiTutorService');

console.log('--- Testing Subject Purity: Life Sciences ---');
const lifeSciRes = ai.generateCAPSLocalFallback('Subject: Life Sciences Grade: 12 Topic: "DNA Replication and Genetics" Generate EXACTLY 3 multiple choice');
console.log('Life Sciences Questions:', JSON.stringify(lifeSciRes.questions, null, 2));

console.log('\n--- Testing Subject Purity: Tourism ---');
const tourRes = ai.generateCAPSLocalFallback('Subject: Tourism Grade: 11 Topic: "Foreign Exchange Calculations" Generate EXACTLY 3 multiple choice');
console.log('Tourism Questions:', JSON.stringify(tourRes.questions, null, 2));

console.log('\n--- Testing Subject Purity: Accounting ---');
const accRes = ai.generateCAPSLocalFallback('Subject: Accounting Grade: 12 Topic: "Companies Financial Statements" Generate EXACTLY 3 multiple choice');
console.log('Accounting Questions:', JSON.stringify(accRes.questions, null, 2));

console.log('\nAll subject tests executed successfully.');
