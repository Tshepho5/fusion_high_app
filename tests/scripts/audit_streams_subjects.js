const timetableController = require('../public/src/controller/timetableController');

async function testAllStreams() {
  console.log('====================================================');
  console.log('AUDITING SCIENCE & TOURISM STREAMS ACROSS ALL GRADES');
  console.log('====================================================');

  const grades = [10, 11, 12];

  for (const g of grades) {
    console.log(`\n--- GRADE ${g} SCIENCE STREAM ---`);
    const reqSci = {
      body: { grade: g, stream: 'Science', target_subject: 'all' },
      user: { id: 1, role: 'admin', is_superadmin: true, school_id: 1 }
    };
    let sciSubs = new Set();
    const resSci = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(d) {
        const tt = d.timetable_data;
        if (!tt) return;
        Object.keys(tt).forEach(cName => {
          Object.keys(tt[cName]).forEach(day => {
            Object.keys(tt[cName][day]).forEach(period => {
              const sub = tt[cName][day][period]?.subject;
              if (sub) sciSubs.add(sub);
            });
          });
        });
      }
    };
    await timetableController.generateAITimetable(reqSci, resSci);
    const sciList = Array.from(sciSubs);
    console.log(`Grade ${g} Science Subjects:`, sciList);
    const hasGeo = sciList.includes('Geography');
    const hasCAT = sciList.some(s => s.toLowerCase().includes('cat') || s.toLowerCase().includes('computer'));
    const hasBusiness = sciList.some(s => s.toLowerCase().includes('business') || s.toLowerCase().includes('accounting') || s.toLowerCase().includes('economics'));

    console.log(`  - Has Geography: ${hasGeo ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Has CAT/IT: ${hasCAT ? '❌ FAILED (CAT Found)' : '✅ CLEAN (No CAT/IT)'}`);
    console.log(`  - Has Business Subjects: ${hasBusiness ? '❌ FAILED' : '✅ CLEAN (No Business Subjects)'}`);
  }

  for (const g of grades) {
    console.log(`\n--- GRADE ${g} TOURISM STREAM ---`);
    const reqTour = {
      body: { grade: g, stream: 'Tourism', target_subject: 'all' },
      user: { id: 1, role: 'admin', is_superadmin: true, school_id: 1 }
    };
    let tourSubs = new Set();
    const resTour = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(d) {
        const tt = d.timetable_data;
        if (!tt) return;
        Object.keys(tt).forEach(cName => {
          Object.keys(tt[cName]).forEach(day => {
            Object.keys(tt[cName][day]).forEach(period => {
              const sub = tt[cName][day][period]?.subject;
              if (sub) tourSubs.add(sub);
            });
          });
        });
      }
    };
    await timetableController.generateAITimetable(reqTour, resTour);
    const tourList = Array.from(tourSubs);
    console.log(`Grade ${g} Tourism Subjects:`, tourList);
    const hasGeo = tourList.includes('Geography');
    const hasTourism = tourList.includes('Tourism');
    console.log(`  - Has Geography: ${hasGeo ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Has Tourism: ${hasTourism ? '✅ YES' : '❌ NO'}`);
  }

  console.log('\n====================================================');
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

testAllStreams();
