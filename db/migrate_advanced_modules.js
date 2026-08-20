const db = require('./db');

async function migrateAdvancedModules() {
  console.log('[MIGRATION] Setting up Advanced School Management tables...');
  try {
    // 1. Exam Sessions & Seating Allocations
    await db.query(`
      CREATE TABLE IF NOT EXISTS exam_sessions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(150),
        grade INTEGER NOT NULL,
        stream VARCHAR(50) DEFAULT 'All',
        term VARCHAR(50) DEFAULT 'Term 3 2026',
        exam_date DATE NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        end_time VARCHAR(20) NOT NULL,
        venue VARCHAR(150) DEFAULT 'Main School Hall',
        total_rows INTEGER DEFAULT 10,
        total_cols INTEGER DEFAULT 6,
        total_desks INTEGER DEFAULT 60,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS exam_seating_allocations (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        desk_number VARCHAR(20) NOT NULL,
        row_num INTEGER NOT NULL,
        col_num INTEGER NOT NULL,
        candidate_number VARCHAR(50),
        attendance_status VARCHAR(30) DEFAULT 'present',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, desk_number),
        UNIQUE(session_id, child_id)
      );

      CREATE INDEX IF NOT EXISTS idx_exam_alloc_session ON exam_seating_allocations(session_id);
      CREATE INDEX IF NOT EXISTS idx_exam_alloc_child ON exam_seating_allocations(child_id);
    `);
    console.log('[MIGRATION] ✓ Exam Sessions and Seating Allocations tables verified.');

    // 2. Sports & Extracurricular Activities
    await db.query(`
      CREATE TABLE IF NOT EXISTS extracurricular_activities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(50) DEFAULT 'Sports', -- Sports, Cultural, Academic
        coach_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        season VARCHAR(50) DEFAULT 'Annual',
        venue VARCHAR(150) DEFAULT 'School Sports Ground',
        practice_schedule VARCHAR(255) DEFAULT 'Tuesdays & Thursdays 15:00 - 16:30',
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS extracurricular_members (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES extracurricular_activities(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'Player', -- Captain, Vice-Captain, Player, Member, Lead Speaker
        jersey_number VARCHAR(10),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_id, child_id)
      );

      CREATE TABLE IF NOT EXISTS extracurricular_events (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES extracurricular_activities(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        event_type VARCHAR(50) DEFAULT 'Match', -- Match, Tournament, Debate, Performance, Practice
        opponent_school VARCHAR(150),
        venue VARCHAR(150) DEFAULT 'Home Ground',
        event_date DATE NOT NULL,
        start_time VARCHAR(20) NOT NULL,
        result_score VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_extra_members_activity ON extracurricular_members(activity_id);
      CREATE INDEX IF NOT EXISTS idx_extra_events_activity ON extracurricular_events(activity_id);
    `);
    console.log('[MIGRATION] ✓ Sports & Extracurriculars tables verified.');

    // 3. Textbook & Learning Asset Inventory
    await db.query(`
      CREATE TABLE IF NOT EXISTS textbook_inventory (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(150) NOT NULL,
        grade INTEGER NOT NULL,
        publisher VARCHAR(150) DEFAULT 'CAPS Approved Publisher',
        isbn VARCHAR(50),
        barcode VARCHAR(50),
        total_copies INTEGER DEFAULT 50,
        available_copies INTEGER DEFAULT 50,
        unit_cost_zar NUMERIC(10, 2) DEFAULT 250.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS textbook_allocations (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER NOT NULL REFERENCES textbook_inventory(id) ON DELETE CASCADE,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        issued_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        issued_date DATE DEFAULT CURRENT_DATE,
        expected_return_date DATE DEFAULT (CURRENT_DATE + INTERVAL '120 days'),
        returned_date DATE,
        condition_on_issue VARCHAR(30) DEFAULT 'Good', -- New, Good, Fair
        condition_on_return VARCHAR(30), -- Good, Fair, Damaged, Lost
        replacement_fee NUMERIC(10, 2) DEFAULT 0.00,
        status VARCHAR(30) DEFAULT 'issued', -- issued, returned, lost, damaged
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_textbook_alloc_child ON textbook_allocations(child_id);
      CREATE INDEX IF NOT EXISTS idx_textbook_alloc_inv ON textbook_allocations(inventory_id);
    `);
    console.log('[MIGRATION] ✓ Textbook Inventory & Allocation tables verified.');

    // Seed default extracurricular activities and initial textbooks if empty
    const actCheck = await db.query('SELECT COUNT(*) FROM extracurricular_activities');
    if (parseInt(actCheck.rows[0].count, 10) === 0) {
      await db.query(`
        INSERT INTO extracurricular_activities (name, category, season, venue, practice_schedule, description)
        VALUES 
          ('First Team Soccer', 'Sports', 'Winter', 'A-Field Soccer Ground', 'Mondays & Wednesdays 15:30 - 17:00', 'Senior boys & girls competitive soccer squad.'),
          ('Netball First Team', 'Sports', 'Winter', 'Netball Courts', 'Tuesdays & Thursdays 15:00 - 16:30', 'Premier school netball league team.'),
          ('Rugby XV', 'Sports', 'Winter', 'Main Rugby Field', 'Mondays & Thursdays 15:30 - 17:00', 'High school rugby team competing in regional leagues.'),
          ('Athletics & Track Club', 'Sports', 'Summer', 'School Athletics Track', 'Wednesdays & Fridays 15:00 - 16:30', 'Sprinting, middle-distance, hurdles, and field events.'),
          ('Chess Champions Guild', 'Academic', 'Annual', 'Library Guild Room', 'Tuesdays 14:30 - 16:00', 'Competitive chess team competing in inter-school tournaments.'),
          ('Debate & Model UN Society', 'Cultural', 'Annual', 'Auditorium', 'Thursdays 15:00 - 16:30', 'Provincial debating league and public speaking competitions.'),
          ('Fusion Harmonix Choir', 'Cultural', 'Annual', 'Music Hall', 'Fridays 14:00 - 16:00', 'School choir performing choral music and cultural festivals.');
      `);
      console.log('[MIGRATION] ✓ Seeded default Extracurricular clubs.');
    }

    const tbCheck = await db.query('SELECT COUNT(*) FROM textbook_inventory');
    if (parseInt(tbCheck.rows[0].count, 10) === 0) {
      await db.query(`
        INSERT INTO textbook_inventory (title, subject, grade, publisher, isbn, barcode, total_copies, available_copies, unit_cost_zar)
        VALUES 
          ('Mind Action Series: Mathematics Grade 12', 'Mathematics', 12, 'Sanlam / Mind Action', '978-1-86921-500-1', 'MATH-12-001', 80, 75, 320.00),
          ('Doc Scientia: Physical Sciences Grade 12', 'Physical Sciences', 12, 'Doc Scientia', '978-0-6395-0012-3', 'PHYS-12-001', 60, 58, 290.00),
          ('Understanding Life Sciences Grade 12', 'Life Sciences', 12, 'Pulse Education', '978-1-92019-228-0', 'LIFE-12-001', 65, 62, 275.00),
          ('New Era Accounting Grade 12', 'Accounting', 12, 'New Generation', '978-1-77581-002-5', 'ACC-12-001', 45, 43, 260.00),
          ('English in Context: Home Language Grade 12', 'English Home Language', 12, 'Maskew Miller Longman', '978-0-636-08573-2', 'ENG-12-001', 100, 95, 240.00),
          ('Platinum Mathematics Grade 10', 'Mathematics', 10, 'Pearson South Africa', '978-0-636-12784-5', 'MATH-10-001', 90, 85, 280.00),
          ('Via Afrika Geography Grade 11', 'Geography', 11, 'Via Afrika', '978-1-41542-268-7', 'GEO-11-001', 50, 48, 265.00);
      `);
      console.log('[MIGRATION] ✓ Seeded default Textbook inventory.');
    }

    console.log('[MIGRATION] Advanced School Management schema initialized successfully!');
  } catch (err) {
    console.error('[MIGRATION ERROR]:', err);
  } finally {
    process.exit(0);
  }
}

migrateAdvancedModules();
