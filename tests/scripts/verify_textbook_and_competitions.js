// tests/scripts/verify_textbook_and_competitions.js
const db = require('../../db/db');
const textbookController = require('../../public/src/controller/textbookController');
const interSchoolController = require('../../public/src/controller/interSchoolController');

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 RUNNING FINAL VERIFICATION: TEXTBOOK INVENTORY & INTER-SCHOOL');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Verify Textbook Inventory Data
    console.log('[1] Checking Textbook Inventory Database & Schema...');
    const invRes = await db.query(`SELECT COUNT(*)::int as count FROM textbook_inventory`);
    assert(invRes.rows[0].count > 0, `Textbook inventory has records (found ${invRes.rows[0].count})`);

    // Test textbookController.getInventory directly
    let textbookResult = null;
    let textbookStatus = 200;
    const mockTextbookRes = {
      status(code) {
        textbookStatus = code;
        return this;
      },
      json(data) {
        textbookResult = data;
        return this;
      }
    };
    await textbookController.getInventory({ query: {} }, mockTextbookRes);
    assert(textbookStatus === 200, `textbookController.getInventory returned HTTP 200`);
    assert(Array.isArray(textbookResult) && textbookResult.length > 0, `Returned ${textbookResult?.length} textbooks`);
    console.log(`    Sample book: "${textbookResult[0].title}" (Grade ${textbookResult[0].grade} ${textbookResult[0].subject}) - ${textbookResult[0].available_copies}/${textbookResult[0].total_copies} available`);

    // 2. Verify Inter-School Competition Database & Schema
    console.log('\n[2] Checking Inter-School Competitions Schema & Query Casting...');
    
    // Simulate req/res for getCompetitions with string parameters (the exact source of the original error)
    const mockReqStringParams = {
      query: {
        category: 'academic',
        status: 'scheduled',
        schoolId: '1' // String parameter that previously caused "operator does not exist: integer = text"
      }
    };
    let jsonResult = null;
    let statusCode = 200;
    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResult = data;
        return this;
      }
    };

    await interSchoolController.getCompetitions(mockReqStringParams, mockRes);
    assert(statusCode === 200, `getCompetitions with string schoolId returned HTTP 200 (actual: ${statusCode})`);
    assert(jsonResult && jsonResult.success === true, 'getCompetitions returned success: true');
    assert(Array.isArray(jsonResult.competitions), `competitions array returned (${jsonResult.competitions.length} items)`);

    // Test with category-only filter
    const mockReqCategory = {
      query: { category: 'sports' }
    };
    await interSchoolController.getCompetitions(mockReqCategory, mockRes);
    assert(statusCode === 200, 'getCompetitions with category filter returned HTTP 200');

    // Test leaderboard calculation
    const mockReqLeaderboard = {
      query: { category: 'all' }
    };
    await interSchoolController.getLeaderboard(mockReqLeaderboard, mockRes);
    assert(statusCode === 200, 'getLeaderboard returned HTTP 200');
    assert(jsonResult && jsonResult.success === true, 'getLeaderboard returned success: true');

    console.log('\n================================================================');
    console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('💥 Unexpected verification error:', err);
    process.exit(1);
  }
}

runVerification();
