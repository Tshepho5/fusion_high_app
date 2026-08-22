const db = require('./db');

async function initFinanceAndBursaries() {
  console.log('--- Initializing Finance (School Fees) & Bursary Matching Schema ---');

  try {
    // 1. Fee Invoices Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS fee_invoices (
        id SERIAL PRIMARY KEY,
        learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'Tuition', -- Tuition, Science Lab, Sports Kit, Matric Dance, Excursion, Transport
        term VARCHAR(50) DEFAULT 'Term 3 2026',
        amount NUMERIC(10, 2) NOT NULL,
        paid_amount NUMERIC(10, 2) DEFAULT 0.00,
        balance NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- pending, partial, paid, overdue
        due_date DATE NOT NULL,
        itemized_breakdown JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fee Payments Table (Simulating PayFast, Ozow, Instant EFT, SnapScan)
    await db.query(`
      CREATE TABLE IF NOT EXISTS fee_payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES fee_invoices(id) ON DELETE CASCADE,
        learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        payment_reference VARCHAR(100) UNIQUE NOT NULL,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL, -- PayFast, Ozow Instant EFT, Debit/Credit Card, SnapScan, Direct Bank Deposit
        gateway_transaction_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'completed', -- completed, pending, failed
        payer_name VARCHAR(255),
        payer_email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Bursaries & Scholarships Master Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bursaries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sponsor VARCHAR(255) NOT NULL,
        logo_url TEXT,
        category VARCHAR(100) NOT NULL, -- STEM & Engineering, Commerce & Finance, Teaching & Education, General & Comprehensive, Technology & ICT
        min_aps INTEGER DEFAULT 28,
        min_aggregate_percentage NUMERIC(5,2) DEFAULT 60.00,
        required_subjects JSONB DEFAULT '[]'::jsonb, -- e.g. ["Mathematics", "Physical Sciences"]
        min_subject_percentage JSONB DEFAULT '{}'::jsonb, -- e.g. {"Mathematics": 70, "Physical Sciences": 70}
        target_fields TEXT[],
        coverage_details TEXT[], -- e.g. ["100% Tuition", "University Accommodation", "Book Allowance", "Laptop Provided", "Monthly Living Stipend"]
        estimated_annual_value NUMERIC(10, 2) DEFAULT 120000.00,
        eligibility_criteria TEXT,
        household_income_cap VARCHAR(100), -- e.g. "Below R350,000 per annum" or "No limit (Merit-based)"
        deadline_date DATE,
        is_open BOOLEAN DEFAULT true,
        application_url TEXT NOT NULL,
        required_documents TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Learner Bursary Tracking & Bookmarks
    await db.query(`
      CREATE TABLE IF NOT EXISTS learner_bursaries (
        id SERIAL PRIMARY KEY,
        learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
        bursary_id INTEGER REFERENCES bursaries(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'bookmarked', -- bookmarked, in_progress, applied, shortlisted, awarded
        notes TEXT,
        checklist_progress JSONB DEFAULT '{}'::jsonb,
        applied_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(learner_id, bursary_id)
      );
    `);

    console.log('✅ Tables created: fee_invoices, fee_payments, bursaries, learner_bursaries.');

    // Seed Real South African Bursaries
    const existingBursaries = await db.query('SELECT COUNT(*) FROM bursaries');
    if (parseInt(existingBursaries.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding South African Top Bursaries...');
      
      const bursariesList = [
        {
          name: 'NSFAS Comprehensive Student Financial Aid',
          sponsor: 'Department of Higher Education & Training (DHET)',
          category: 'General & Comprehensive',
          min_aps: 25,
          min_aggregate_percentage: 50.00,
          required_subjects: JSON.stringify(['English FAL', 'Mathematics']),
          min_subject_percentage: JSON.stringify({}),
          target_fields: ['All Accredited Public University & TVET College Degrees/Diplomas'],
          coverage_details: ['100% Full Tuition Coverage', 'Campus/Accredited Accommodation', 'Prescribed Books Allowance', 'Monthly Meal & Personal Allowance', 'Laptop Allowance'],
          estimated_annual_value: 115000.00,
          eligibility_criteria: 'South African citizen studying at a public university or TVET college with combined household income not exceeding R350,000 per annum (or R600,000 for persons living with disabilities).',
          household_income_cap: 'Max R350,000 / annum',
          deadline_date: '2026-11-30',
          application_url: 'https://www.nsfas.org.za',
          required_documents: ['Certified copy of Learner Smart ID / Birth Certificate', 'Certified copy of Parent/Guardian ID', 'Proof of Household Income / SASSA Letter', 'Official Grade 11/12 Academic Results']
        },
        {
          name: 'Sasol STEM & Engineering Corporate Bursary',
          sponsor: 'Sasol Energy & Chemical Corporation',
          category: 'STEM & Engineering',
          min_aps: 34,
          min_aggregate_percentage: 70.00,
          required_subjects: JSON.stringify(['Mathematics', 'Physical Sciences']),
          min_subject_percentage: JSON.stringify({ 'Mathematics': 70, 'Physical Sciences': 70 }),
          target_fields: ['Chemical Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Chemistry', 'Data Science'],
          coverage_details: ['Full University Tuition Fees', 'University Residence & Meals', 'Book Allowance (R12,000/yr)', 'Personal High-Spec Laptop', 'Monthly Living Stipend', 'Vacation Work & Graduate Placement'],
          estimated_annual_value: 185000.00,
          eligibility_criteria: 'Grade 12 South African learners with minimum 70% in Pure Mathematics and 70% in Physical Sciences pursuing STEM disciplines.',
          household_income_cap: 'Merit-Based (Open to All)',
          deadline_date: '2026-05-15',
          application_url: 'https://www.sasolbursaries.com',
          required_documents: ['Certified South African ID', 'Grade 11 Final Report Card', 'Grade 12 Term 1 & 2 Results', 'Motivational Essay']
        },
        {
          name: 'Allan Gray Orbis Foundation Fellowship',
          sponsor: 'Allan Gray Foundation',
          category: 'Commerce & Finance',
          min_aps: 33,
          min_aggregate_percentage: 70.00,
          required_subjects: JSON.stringify(['Mathematics', 'English']),
          min_subject_percentage: JSON.stringify({ 'Mathematics': 70, 'English': 65 }),
          target_fields: ['Commerce', 'Economics', 'Business Science', 'Engineering', 'Law', 'Information Systems'],
          coverage_details: ['Full University Tuition & Registration', 'Full Residence & Catering Accommodation', 'Textbook Allowance', 'Monthly Stipend', 'Mentorship & Entrepreneurial Leadership Camp'],
          estimated_annual_value: 195000.00,
          eligibility_criteria: 'High-impact entrepreneurial mindset with minimum 70% overall academic aggregate and Level 6 in Mathematics.',
          household_income_cap: 'Open to All with Financial Need Component',
          deadline_date: '2026-04-30',
          application_url: 'https://www.allangrayorbis.org',
          required_documents: ['ID Document', 'Grade 11 Final Report', 'Academic Referee Recommendation', 'Community Leadership Portfolio']
        },
        {
          name: 'Nedbank Youth Educational Bursary',
          sponsor: 'Nedbank Group',
          category: 'Commerce & Finance',
          min_aps: 32,
          min_aggregate_percentage: 65.00,
          required_subjects: JSON.stringify(['Mathematics', 'Accounting']),
          min_subject_percentage: JSON.stringify({ 'Mathematics': 65 }),
          target_fields: ['Accounting (CA Track)', 'Actuarial Science', 'Computer Science', 'Financial Technology', 'Economics'],
          coverage_details: ['Full Tuition Fees', 'Campus Accommodation', 'Book & Study Material Allowance', 'Meal Subsidies', 'Graduate Development Program'],
          estimated_annual_value: 150000.00,
          eligibility_criteria: 'Proven academic merit (65%+ aggregate) in commerce, computer science, or actuarial streams.',
          household_income_cap: 'R350,000 - R600,000 / annum',
          deadline_date: '2026-06-30',
          application_url: 'https://www.nedbank.co.za/bursaries',
          required_documents: ['Certified ID Copy', 'Parent Salary Slips / Affidavit', 'Official School Report']
        },
        {
          name: 'Funza Lushaka National Teaching Bursary',
          sponsor: 'Department of Basic Education (DBE)',
          category: 'Teaching & Education',
          min_aps: 28,
          min_aggregate_percentage: 60.00,
          required_subjects: JSON.stringify(['Home Language', 'Mathematics']),
          min_subject_percentage: JSON.stringify({}),
          target_fields: ['Bachelor of Education (B.Ed)', 'PGCE (Senior/FET Phase: Mathematics, Physical Sciences, African Languages, Foundation Phase)'],
          coverage_details: ['100% University Tuition', 'Full Accommodation & Meals', 'Books & Learning Materials', 'Living Allowance', 'Guaranteed Provincial DBE Teaching Placement'],
          estimated_annual_value: 110000.00,
          eligibility_criteria: 'South African citizens dedicated to qualifying as educators in national priority subject areas (STEM, Foundation Phase, African Languages). Requires entering public service upon graduation.',
          household_income_cap: 'No Income Cap',
          deadline_date: '2026-09-30',
          application_url: 'https://www.funzalushaka.doe.gov.za',
          required_documents: ['ID Document', 'Grade 12 Results / Statement of Results', 'Proof of University B.Ed Admission']
        },
        {
          name: 'Investec Tertiary Scholarship Programme',
          sponsor: 'Investec Bank Limited',
          category: 'Commerce & Finance',
          min_aps: 34,
          min_aggregate_percentage: 70.00,
          required_subjects: JSON.stringify(['Mathematics', 'English']),
          min_subject_percentage: JSON.stringify({ 'Mathematics': 70, 'English': 70 }),
          target_fields: ['Commerce', 'Accounting', 'Computer Science', 'Actuarial Science', 'Engineering'],
          coverage_details: ['Full University Tuition', 'Residence Accommodation', 'Textbook Allowance', 'Work Readiness Mentorship'],
          estimated_annual_value: 165000.00,
          eligibility_criteria: 'High academic achievers applying for degree studies with a passion for banking, technology, and wealth management.',
          household_income_cap: 'Financial Need Assessment',
          deadline_date: '2026-05-31',
          application_url: 'https://www.investec.com/bursaries',
          required_documents: ['Certified ID', 'School Academic Record', 'Proof of Household Income']
        },
        {
          name: 'Vodacom Digital Technology & AI Scholarship',
          sponsor: 'Vodacom Foundation',
          category: 'Technology & ICT',
          min_aps: 32,
          min_aggregate_percentage: 68.00,
          required_subjects: JSON.stringify(['Mathematics', 'Information Technology']),
          min_subject_percentage: JSON.stringify({ 'Mathematics': 65 }),
          target_fields: ['Information Technology', 'Computer Science', 'Software Development', 'Artificial Intelligence', 'Cybersecurity'],
          coverage_details: ['Full University Fees', 'Catered Accommodation', 'High-Spec Laptop & Connectivity Pack', 'Book Allowance', 'Internship Placement at Vodacom'],
          estimated_annual_value: 170000.00,
          eligibility_criteria: 'Passionate tech enthusiasts looking to shape South Africa’s digital economy with top marks in Mathematics and IT/Science.',
          household_income_cap: 'Max R400,000 / annum',
          deadline_date: '2026-08-31',
          application_url: 'https://www.vodacom.co.za/bursaries',
          required_documents: ['ID Copy', 'Academic Transcript', 'Personal Tech Project / Motivational Letter']
        },
        {
          name: 'Old Mutual Actuarial Science & STEM Bursary',
          sponsor: 'Old Mutual Limited',
          category: 'Commerce & Finance',
          min_aps: 36,
          min_aggregate_percentage: 80.00,
          required_subjects: JSON.stringify(['Mathematics', 'English']),
          min_subject_percentage: JSON.stringify({ 'Mathematics': 85, 'English': 70 }),
          target_fields: ['Actuarial Science', 'Applied Mathematics', 'Quantitative Finance', 'Data Analytics'],
          coverage_details: ['100% University Tuition & Registration', 'Full Residence & Meal Costs', 'Generous Book Allowance', 'Monthly Living Allowance', 'Travel Allowance & Study Incentive Bonuses'],
          estimated_annual_value: 210000.00,
          eligibility_criteria: 'Exceptional mathematical aptitude (minimum 85% in Pure Mathematics) aiming for FASSA / FIA Actuarial qualification.',
          household_income_cap: 'Merit-Based (Open)',
          deadline_date: '2026-05-30',
          application_url: 'https://www.oldmutual.co.za/bursaries',
          required_documents: ['Certified ID', 'Official Grade 11 & Grade 12 Reports', 'Proof of University Actuarial Application']
        }
      ];

      for (const b of bursariesList) {
        await db.query(`
          INSERT INTO bursaries (
            name, sponsor, category, min_aps, min_aggregate_percentage,
            required_subjects, min_subject_percentage, target_fields,
            coverage_details, estimated_annual_value, eligibility_criteria,
            household_income_cap, deadline_date, application_url, required_documents
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          b.name, b.sponsor, b.category, b.min_aps, b.min_aggregate_percentage,
          b.required_subjects, b.min_subject_percentage, b.target_fields,
          b.coverage_details, b.estimated_annual_value, b.eligibility_criteria,
          b.household_income_cap, b.deadline_date, b.application_url, b.required_documents
        ]);
      }
      console.log(`✅ Seeded ${bursariesList.length} South African Top Bursaries.`);
    }

    // Seed Sample School Fee Invoices for Registered Children
    const existingInvoices = await db.query('SELECT COUNT(*) FROM fee_invoices');
    if (parseInt(existingInvoices.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding Sample School Fee Invoices...');
      const children = (await db.query(`
        SELECT c.id, c.full_name, c.surname, c.grade, pc.parent_id 
        FROM children c 
        LEFT JOIN parent_children pc ON c.id = pc.child_id 
        LIMIT 10
      `)).rows;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const invNum = `INV-2026-T3-${String(child.id).padStart(4, '0')}`;
        const childName = child.full_name || 'Learner';
        const childSur = child.surname || '';
        
        const isPaid = i % 2 === 0;
        const total = 4850.00;
        const paid = isPaid ? 4850.00 : 1500.00;
        const bal = total - paid;
        const status = isPaid ? 'paid' : 'partial';

        const breakdown = [
          { item: `Grade ${child.grade || 10} CAPS Tuition (Term 3)`, amount: 3500.00 },
          { item: 'Digital AI Learning & Computer Lab Levy', amount: 450.00 },
          { item: 'Science Laboratory & Consumables Fee', amount: 400.00 },
          { item: 'Sports League & Cultural Affiliation Levy', amount: 300.00 },
          { item: 'Emergency Medical Care & Security Surcharge', amount: 200.00 }
        ];

        const invRes = await db.query(`
          INSERT INTO fee_invoices (
            learner_id, parent_id, invoice_number, title, description, category,
            term, amount, paid_amount, balance, status, due_date, itemized_breakdown
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id;
        `, [
          child.id,
          child.parent_id || null,
          invNum,
          `Term 3 2026 Academic Tuition & Levies — ${childName} ${childSur}`,
          `Official School Fee Statement for Grade ${child.grade || 10}`,
          'Tuition',
          'Term 3 2026',
          total,
          paid,
          bal,
          status,
          '2026-09-15',
          JSON.stringify(breakdown)
        ]);

        if (paid > 0) {
          const invId = invRes.rows[0].id;
          await db.query(`
            INSERT INTO fee_payments (
              invoice_id, learner_id, parent_id, payment_reference, receipt_number,
              amount, payment_method, gateway_transaction_id, status, payer_name, payer_email, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            invId,
            child.id,
            child.parent_id || null,
            `PAY-2026-${Date.now()}-${child.id}`,
            `REC-2026-${String(child.id).padStart(4, '0')}`,
            paid,
            i % 2 === 0 ? 'PayFast Instant Settlement' : 'Ozow Instant EFT',
            `GW-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            'completed',
            `Parent of ${childName}`,
            'parent@fusionhigh.co.za',
            `Settlement for ${invNum}`
          ]);
        }
      }
      console.log('✅ Seeded Sample Invoices & Receipts.');
    }

    console.log('--- Finance & Bursary Schema Initialization Complete ---');
  } catch (err) {
    console.error('❌ Error initializing finance and bursary schema:', err);
  }
}

if (require.main === module) {
  initFinanceAndBursaries().then(() => process.exit(0));
}

module.exports = { initFinanceAndBursaries };
