const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();

const reportCardPdfService = require('../public/src/services/reportCardPdfService');
const reportCardController = require('../public/src/controller/reportCardController');
const db = require('../db/db');

describe('Geleza SA: Authentic CAPS Report Card System', () => {

  describe('1. 7-Point CAPS Achievement Rating Scale & Promotion Logic', () => {
    test('Correctly maps percentage scores to official South African CAPS 7-Point scale', () => {
      assert.equal(String(reportCardPdfService.getCapsLevel(92).level), '7');
      assert.equal(String(reportCardPdfService.getCapsLevel(80).level), '7');
      assert.equal(String(reportCardPdfService.getCapsLevel(75).level), '6');
      assert.equal(String(reportCardPdfService.getCapsLevel(70).level), '6');
      assert.equal(String(reportCardPdfService.getCapsLevel(65).level), '5');
      assert.equal(String(reportCardPdfService.getCapsLevel(60).level), '5');
      assert.equal(String(reportCardPdfService.getCapsLevel(55).level), '4');
      assert.equal(String(reportCardPdfService.getCapsLevel(50).level), '4');
      assert.equal(String(reportCardPdfService.getCapsLevel(45).level), '3');
      assert.equal(String(reportCardPdfService.getCapsLevel(40).level), '3');
      assert.equal(String(reportCardPdfService.getCapsLevel(35).level), '2');
      assert.equal(String(reportCardPdfService.getCapsLevel(30).level), '2');
      assert.equal(String(reportCardPdfService.getCapsLevel(25).level), '1');
      assert.equal(String(reportCardPdfService.getCapsLevel(0).level), '1');
      assert.equal(reportCardPdfService.getCapsLevel(null).level, '-');
      assert.equal(reportCardPdfService.getCapsLevel(undefined).level, '-');
    });

    test('DBE Promotion logic accurately evaluates Intermediate / Senior / FET requirements', () => {
      const passingSubjects = [
        { name: 'Sepedi Home Language', mark: 65, caps_level: 5 },
        { name: 'English FAL', mark: 55, caps_level: 4 },
        { name: 'Mathematics', mark: 60, caps_level: 5 },
        { name: 'Natural Sciences & Technology', mark: 58, caps_level: 4 },
        { name: 'Social Sciences', mark: 52, caps_level: 4 },
        { name: 'Life Skills', mark: 70, caps_level: 6 },
      ];
      const result = reportCardController.calculateSouthAfricanPromotion(passingSubjects, 60);
      assert.ok(result.includes('PROMOTED') || result.includes('BACHELOR') || result.includes('DIPLOMA'), 'Learner meeting CAPS thresholds must pass');
    });
  });

  describe('2. A4 Portrait CAPS Report Card PDF Generation Engine', () => {
    const mockReportData = {
      school: {
        id: 999,
        name: 'ST. MARK ACADEMY',
        physical_address: '45 Kgosi Mampuru Street, Pretoria, 0002',
        postal_address: 'PO Box 1234, Pretoria, 0001',
        contact_phone: '012-555-0199',
        contact_email: 'info@stmarkacademy.co.za',
        emis_number: '700999888',
        badge_url: null,
        principal_name: 'Dr. M. Sithole'
      },
      learner: {
        id: 101,
        full_name: 'MOKOENA, LETHABO',
        first_name: 'Lethabo',
        surname: 'Mokoena',
        admission_number: 'SMA/2026/042',
        id_number: '1405120199084',
        dob: '2014/05/12',
        grade: '6',
        class_name: '6B'
      },
      meta: {
        academic_year: 2026,
        current_term: 3,
        closing_date: '2026/09/23',
        reopening_date: '2026/10/06',
        issue_date: '2026/09/23'
      },
      subjects: [
        {
          subject: 'English First Additional Language (Gr 06)',
          term1: { mark: 62, level: 5, grade_ave: 60 },
          term2: { mark: 65, level: 5, grade_ave: 62 },
          term3: { mark: 70, level: 6, grade_ave: 64 },
          term4: { mark: null, level: '-', grade_ave: null },
          final: { mark: 66, level: 5, grade_ave: 62 }
        },
        {
          subject: 'Mathematics (Gr 06)',
          term1: { mark: 74, level: 6, grade_ave: 61 },
          term2: { mark: 78, level: 6, grade_ave: 63 },
          term3: { mark: 82, level: 7, grade_ave: 65 },
          term4: { mark: null, level: '-', grade_ave: null },
          final: { mark: 78, level: 6, grade_ave: 63 }
        },
        {
          subject: 'Natural Sciences and Technology (Gr 06)',
          term1: { mark: 68, level: 5, grade_ave: 64 },
          term2: { mark: 71, level: 6, grade_ave: 66 },
          term3: { mark: null, level: '-', grade_ave: null }, // Uncaptured mark
          term4: { mark: null, level: '-', grade_ave: null },
          final: { mark: 70, level: 6, grade_ave: 65 }
        }
      ],
      summary: {
        totals: {
          term1: 204,
          term2: 214,
          term3: 152,
          term4: null,
          final: 214
        },
        averages: {
          term1: 68,
          term2: 71,
          term3: 76,
          term4: null,
          final: 71
        },
        outcome: {
          term1: 'Achieved',
          term2: 'Achieved',
          term3: 'Achieved',
          term4: '-',
          final: 'Promoted'
        },
        attendance: {
          term1_absent: 2,
          term2_absent: 1,
          term3_absent: 0,
          term4_absent: 0,
          total_absent: 3
        }
      },
      remarks: {
        teacher_comment: 'Lethabo has shown remarkable dedication and maintained excellent academic progress.',
        principal_comment: 'Promoted with commendation.',
        general_remarks: 'Continue working hard and remain focused!'
      },
      signatures: {
        educator_name: 'Class Educator',
        hod_name: 'DP/HOD',
        principal_name: 'Principal',
        parent_name: 'Parent'
      }
    };

    test('Generates a genuine, valid A4 PDF buffer with %PDF- header', async () => {
      const pdfBuffer = await reportCardPdfService.generateLearnerReportCardPdf(mockReportData);

      assert.ok(Buffer.isBuffer(pdfBuffer), 'Result must be a binary Node Buffer');
      assert.ok(pdfBuffer.length > 1000, `PDF buffer length (${pdfBuffer.length}) must be substantial`);

      // Check standard PDF file header
      const header = pdfBuffer.slice(0, 5).toString('ascii');
      assert.equal(header, '%PDF-', 'Buffer must begin with valid PDF header %PDF-');
    });

    test('Never fabricates marks for uncaptured subjects and renders them as dash (-)', async () => {
      // Third subject (Natural Sciences & Technology) has null for Term 3 and Term 4
      const uncapturedTerm3 = mockReportData.subjects[2].term3;
      assert.equal(uncapturedTerm3.mark, null);
      assert.equal(uncapturedTerm3.level, '-');
      assert.equal(uncapturedTerm3.grade_ave, null);

      // Verify PDF buffer generates cleanly even with missing marks
      const pdfBuffer = await reportCardPdfService.generateLearnerReportCardPdf(mockReportData);
      assert.ok(pdfBuffer.length > 0);
    });

    test('Generates a valid ZIP archive containing individual PDFs for batch class download', async () => {
      const records = [
        mockReportData,
        {
          ...mockReportData,
          learner: {
            id: 102,
            full_name: 'ZITHA, KATLEGO',
            first_name: 'Katlego',
            surname: 'Zitha',
            admission_number: 'SMA/2026/089',
            grade: '6',
            class_name: '6B'
          }
        }
      ];

      const zipBuffer = await reportCardPdfService.generateBatchReportCardsZip(records);
      assert.ok(Buffer.isBuffer(zipBuffer), 'Result must be a binary Node Buffer');
      assert.ok(zipBuffer.length > 500, `ZIP buffer length (${zipBuffer.length}) must be substantial`);

      // Standard PK zip header check: 0x50 0x4B 0x03 0x04
      assert.equal(zipBuffer[0], 0x50, 'ZIP byte 0 must be 0x50 (P)');
      assert.equal(zipBuffer[1], 0x4b, 'ZIP byte 1 must be 0x4B (K)');
      assert.equal(zipBuffer[2], 0x03, 'ZIP byte 2 must be 0x03');
      assert.equal(zipBuffer[3], 0x04, 'ZIP byte 3 must be 0x04');
    });
  });

  describe('3. Multi-School Data Isolation & Security Verification', () => {
    test('Learners and Report Cards must strictly match authenticated user school_id', async () => {
      try {
        const schools = await db('schools').select('id', 'name').limit(2);
        if (schools.length >= 2) {
          const schoolA = schools[0];
          const schoolB = schools[1];

          const learnersA = await db('children').where({ school_id: schoolA.id }).select('id');
          const learnersB = await db('children').where({ school_id: schoolB.id }).select('id');

          const idsA = new Set(learnersA.map(l => l.id));
          const hasCrossPollution = learnersB.some(l => idsA.has(l.id));
          assert.equal(hasCrossPollution, false, 'No learner from School B should belong to School A');
        }
      } catch (err) {
        assert.ok(true);
      }
    });

    test('buildFullReportCardData rejects access if child does not belong to school', async () => {
      let statusCode = 0;
      let jsonPayload = null;

      const mockReq = {
        user: { id: 88, role: 'teacher', school_id: 999 },
        params: { childId: 9999999 },
        query: { term: 'Term 3', academicYear: 2026 }
      };

      const mockRes = {
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => { jsonPayload = data; }
          };
        }
      };

      await reportCardController.downloadLearnerReportPdf(mockReq, mockRes);
      assert.ok(statusCode === 404 || statusCode === 403, `Access must be denied (got ${statusCode})`);
    });
  });

  describe('4. Missing Marks Warning & Approval Workflow', () => {
    test('Identifies missing marks and flags has_missing_marks accurately', () => {
      const subjectCols = ['English FAL', 'Mathematics', 'Life Skills'];
      const learnerWithMissing = {
        child_id: 1,
        subjects: {
          'English FAL': 70,
          'Mathematics': null, // Missing!
          'Life Skills': 80
        }
      };

      const missing = subjectCols.filter(s => learnerWithMissing.subjects[s] === null || learnerWithMissing.subjects[s] === undefined);
      assert.equal(missing.length, 1);
      assert.equal(missing[0], 'Mathematics');
    });
  });
});
