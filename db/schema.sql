-- Drop tables in an order that respects dependencies
DROP TABLE IF EXISTS report_cards CASCADE;
DROP TABLE IF EXISTS inter_school_competitions CASCADE;
DROP TABLE IF EXISTS teacher_consultations CASCADE;
DROP TABLE IF EXISTS ptc_bookings CASCADE;
DROP TABLE IF EXISTS ptc_slots CASCADE;
DROP TABLE IF EXISTS ptc_sessions CASCADE;
DROP TABLE IF EXISTS fee_payments CASCADE;
DROP TABLE IF EXISTS fee_invoices CASCADE;
DROP TABLE IF EXISTS assessment_results CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS timetables CASCADE;
DROP TABLE IF EXISTS textbooks CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS employee_roles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0. Core Schools Registry (Multi-School Hierarchy)
CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255),
  emis_number VARCHAR(50),
  circuit VARCHAR(100),
  district VARCHAR(100),
  province VARCHAR(100),
  physical_address TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  principal_name VARCHAR(255),
  logo_url TEXT DEFAULT '/assets/FH.png',
  badge_url TEXT DEFAULT '/assets/FH.png',
  primary_color VARCHAR(20) DEFAULT '#4f46e5',
  secondary_color VARCHAR(20) DEFAULT '#06b6d4',
  accent_color VARCHAR(20) DEFAULT '#f59e0b',
  motto TEXT DEFAULT 'Innovate, Lead, Transform',
  curriculum_type VARCHAR(100) DEFAULT 'CAPS (DBE Limpopo)',
  grade_range VARCHAR(50) DEFAULT '8-12',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schools (id, name, slug, domain, emis_number, circuit, district, province, physical_address, contact_email, contact_phone, principal_name, logo_url, badge_url, primary_color, secondary_color, accent_color, motto, curriculum_type, grade_range)
VALUES
  -- 1. Limpopo (Polokwane & Mankweng - Capricorn South District)
  (1, 'Fusion High School', 'fusion-high', 'fusion-high.co.za', '911220001', 'Polokwane Central Circuit', 'Capricorn South', 'Limpopo', 'Polokwane Central, Limpopo, 0700', 'admin@fusionhigh.co.za', '+27 15 291 0000', 'Dr. T. Makola', '/assets/schools/fusion-high.svg', '/assets/schools/fusion-high.svg', '#4f46e5', '#06b6d4', '#f59e0b', 'Innovate, Lead, Transform', 'CAPS (DBE Limpopo)', '8-12'),
  (2, 'Mountainview Senior Secondary School', 'mountainview-high', 'mountainview.co.za', '923241054', 'Mankweng Circuit', 'Capricorn South', 'Limpopo', 'Mankweng Unit B/C, Polokwane, 0727', 'info@mountainviewhigh.co.za', '+27 15 267 1100', 'Mr. M. S. Phasha', '/assets/schools/mountainview-high.svg', '/assets/schools/mountainview-high.svg', '#7A1426', '#D4AF37', '#F59E0B', 'Strive for Excellence', 'CAPS (DBE Limpopo)', '8-12'),
  (3, 'Makgoka High School', 'makgoka-high', 'makgoka.co.za', '923240457', 'Molepo Circuit', 'Capricorn South', 'Limpopo', 'Maclean Farm, Boyne, Mankweng Area, 0727', 'admin@makgoka.co.za', '+27 15 266 0022', 'Mrs. K. E. Molepo', '/assets/schools/makgoka-high.svg', '/assets/schools/makgoka-high.svg', '#065f46', '#10b981', '#fbbf24', 'Thuto Ke Lesedi', 'CAPS (DBE Limpopo)', '8-12'),
  (4, 'Turfloop High School', 'turfloop-high', 'turfloop.co.za', '923240890', 'Mankweng Circuit', 'Capricorn South', 'Limpopo', 'University Road, Turfloop, Mankweng, 0727', 'principal@turfloophigh.co.za', '+27 15 267 3300', 'Mr. N. J. Mamabolo', '/assets/schools/turfloop-high.svg', '/assets/schools/turfloop-high.svg', '#1e1b4b', '#4338ca', '#991b1b', 'Education for Progress', 'CAPS (DBE Limpopo)', '8-12'),
  (5, 'Hwiti High School', 'hwiti-high', 'hwiti.co.za', '923240150', 'Mankweng Circuit', 'Capricorn South', 'Limpopo', '118 Zone 1, Hwiti St, Mankweng/Sovenga, 0727', 'info@hwitisecondary.co.za', '+27 15 267 4400', 'Mrs. R. M. Ramokgopa', '/assets/schools/hwiti-high.svg', '/assets/schools/hwiti-high.svg', '#581c87', '#9333ea', '#06b6d4', 'Tsebo Ke Maatla', 'CAPS (DBE Limpopo)', '8-12'),
  (6, 'Ngwana Mohube Secondary School', 'ngwana-mohube', 'ngwanamohube.co.za', '923260994', 'Mankweng Circuit', 'Capricorn South', 'Limpopo', 'Gamphahlele, Seleteng, Limpopo, 0734', 'admin@ngwanamohube.co.za', '+27 15 267 5500', 'Mr. S. P. Mohube', '/assets/schools/ngwana-mohube.svg', '/assets/schools/ngwana-mohube.svg', '#991b1b', '#ef4444', '#0f172a', 'Thuto Ke Maatla', 'CAPS (DBE Limpopo)', '8-12'),
  
  -- 2. Gauteng (Lotus Gardens & Atteridgeville, Pretoria - GDE)
  (7, 'Fusion Secondary School (Lotus Gardens)', 'fusion-secondary-lotus', 'fusionsecondary.co.za', '700232348', 'Tshwane West District', 'Tshwane West', 'Gauteng', '809 Cyme Crescent, Lotus Gardens, Pretoria, 0008', 'admin@fusionsecondary.co.za', '+27 12 373 0000', 'Dr. T. Makola', '/assets/schools/fusion-secondary-lotus.svg', '/assets/schools/fusion-secondary-lotus.svg', '#4f46e5', '#06b6d4', '#f59e0b', 'Innovate, Aspire, Achieve', 'CAPS (GDE Gauteng)', '8-12'),
  (8, 'Saulridge Secondary School', 'saulridge-secondary', 'saulridge.co.za', '700232223', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', 'Ramokgopa St, Saulsville, Atteridgeville, Pretoria, 0008', 'info@saulridge.co.za', '+27 12 375 6000', 'Mr. K. E. Masemola', '/assets/schools/saulridge-secondary.svg', '/assets/schools/saulridge-secondary.svg', '#1e3a8a', '#f59e0b', '#3b82f6', 'Knowledge is Power', 'CAPS (GDE Gauteng)', '8-12'),
  (9, 'Phelindaba Secondary School', 'phelindaba-secondary', 'phelindaba.co.za', '700232124', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', 'Kgwale St, Atteridgeville, Pretoria, 0008', 'admin@phelindaba.co.za', '+27 12 373 8100', 'Mrs. M. T. Sithole', '/assets/schools/phelindaba-secondary.svg', '/assets/schools/phelindaba-secondary.svg', '#14532d', '#eab308', '#10b981', 'Strive for Success', 'CAPS (GDE Gauteng)', '8-12'),
  (10, 'Flavius Mareka Secondary School', 'flavius-mareka', 'flaviusmareka.co.za', '700231670', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', 'Khoza St, Atteridgeville, Pretoria, 0008', 'principal@flaviusmareka.co.za', '+27 12 373 9200', 'Mr. L. N. Maluleke', '/assets/schools/flavius-mareka.svg', '/assets/schools/flavius-mareka.svg', '#1d4ed8', '#38bdf8', '#fbbf24', 'Excellence in Action', 'CAPS (GDE Gauteng)', '8-12'),
  (11, 'Dr. W.F. Nkomo Secondary School', 'wf-nkomo-secondary', 'wfnkomo.co.za', '700231613', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', '84 Khudu St, Atteridgeville, Pretoria, 0008', 'info@wfnkomo.co.za', '+27 12 375 7300', 'Mr. D. M. Ndlovu', '/assets/schools/wf-nkomo-secondary.svg', '/assets/schools/wf-nkomo-secondary.svg', '#881337', '#f43f5e', '#fbbf24', 'Labor Omnia Vincit (Work Conquers All)', 'CAPS (GDE Gauteng)', '8-12'),
  (12, 'Hofmeyr Secondary School', 'hofmeyr-secondary', 'hofmeyr.co.za', '700231746', 'Tshwane South District (D4)', 'Tshwane South', 'Gauteng', '1 Mngadi and Mafole St, Atteridgeville, Pretoria, 0008', 'admin@hofmeyr.co.za', '+27 12 373 7400', 'Mrs. S. R. Mogale', '/assets/schools/hofmeyr-secondary.svg', '/assets/schools/hofmeyr-secondary.svg', '#581c87', '#14b8a6', '#f59e0b', 'Education for Liberation', 'CAPS (GDE Gauteng)', '8-12')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  emis_number = EXCLUDED.emis_number,
  circuit = EXCLUDED.circuit,
  district = EXCLUDED.district,
  province = EXCLUDED.province,
  physical_address = EXCLUDED.physical_address,
  logo_url = EXCLUDED.logo_url,
  badge_url = EXCLUDED.badge_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  motto = EXCLUDED.motto;

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL);

INSERT INTO roles (name)
VALUES ('admin'),
       ('parent'),
       ('learner'),
       ('teacher') ON CONFLICT DO NOTHING;

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

INSERT INTO departments (name, description)
VALUES ('Administration', 'Handles overall school management and administration.'),
       ('Academic', 'Responsible for teaching staff and curriculum.'),
       ('Maintenance', 'Manages cleaning, repairs, and facilities.'),
       ('IT', 'Oversees technology infrastructure and support.') ON CONFLICT DO NOTHING;

CREATE TABLE employee_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO employee_roles (name)
VALUES ('teacher'),
       ('Principal'),
       ('Vice_Principal') ON CONFLICT DO NOTHING;

CREATE TABLE users
  (id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL, 
  school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  is_superadmin BOOLEAN DEFAULT FALSE,
  full_name VARCHAR(255),
  surname VARCHAR(255),
  id_number VARCHAR(20),
  dob DATE, 
  gender VARCHAR(10),
  phone VARCHAR(20),
  physical_address TEXT, 
  country VARCHAR(100),
  race VARCHAR(50),
  parent_type VARCHAR(50),
  reset_code VARCHAR(10),
  reset_expiry TIMESTAMP, 
  profile_picture_path VARCHAR(255),
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees
  (id SERIAL PRIMARY KEY,
   user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   employee_role_id INTEGER REFERENCES employee_roles(id),
   full_name VARCHAR(255) NOT NULL,
   surname VARCHAR(255) NOT NULL,
   department_id INTEGER REFERENCES departments(id),
   subjects TEXT[] DEFAULT '{}',
   subject_codes TEXT[] DEFAULT '{}',
   grades_taught INTEGER[] DEFAULT '{}',
   classes_taught TEXT[] DEFAULT '{}',
   phone VARCHAR(20),
   email VARCHAR(255),
   hired_date DATE,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE classes
  (id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- e.g., '10A', '11B Science'
  grade INTEGER NOT NULL CHECK (grade BETWEEN 8 AND 12), 
  stream VARCHAR(50) CHECK (stream IN ('General','Science','Commerce','Tourism')), 
  homeroom_teacher_id INTEGER REFERENCES employees(user_id) ON DELETE SET NULL
);

-- Seed sample classes

INSERT INTO classes (name, grade, stream)
VALUES ('10A', 10, 'Science'),
       ('10B', 10, 'Commerce'),
       ('11A', 11, 'Science'),
       ('11B', 11, 'Tourism'),
       ('12A', 12, 'Science'),
       ('12B', 12, 'Commerce') ON CONFLICT DO NOTHING;

CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 8 AND 12), 
  stream VARCHAR(50) DEFAULT 'General' CHECK (stream IN ('General','Science','Commerce','Tourism'))
);

-- Seed CAPS Subjects (Abbreviated Sample)

INSERT INTO subjects (name, code, grade, stream)
VALUES -- Science Stream (Grade 10-12) - Strictly Excludes CAT/IT, Includes Geography
('Mathematics', 'MATH10S', 10, 'Science'),
('Physical Sciences', 'PHSC10', 10, 'Science'),
('Life Sciences', 'LFSC10', 10, 'Science'),
('Geography', 'GEOG10S', 10, 'Science'),
('Mathematics', 'MATH11S', 11, 'Science'),
('Physical Sciences', 'PHSC11', 11, 'Science'),
('Life Sciences', 'LFSC11', 11, 'Science'),
('Geography', 'GEOG11S', 11, 'Science'),
('Mathematics', 'MATH12S', 12, 'Science'),
('Physical Sciences', 'PHSC12', 12, 'Science'),
('Life Sciences', 'LFSC12', 12, 'Science'),
('Geography', 'GEOG12S', 12, 'Science'),

-- Commerce Stream (Grade 10-12)
('Accounting', 'ACC10', 10, 'Commerce'),
('Business Studies', 'BUSS10', 10, 'Commerce'),
('Economics', 'ECON10', 10, 'Commerce'),
('Mathematics', 'MATH10C', 10, 'Commerce'),
('Mathematical Literacy', 'MLIT10C', 10, 'Commerce'),
('Accounting', 'ACC11', 11, 'Commerce'),
('Business Studies', 'BUSS11', 11, 'Commerce'),
('Economics', 'ECON11', 11, 'Commerce'),
('Mathematics', 'MATH11C', 11, 'Commerce'),
('Mathematical Literacy', 'MLIT11C', 11, 'Commerce'),
('Accounting', 'ACC12', 12, 'Commerce'),
('Business Studies', 'BUSS12', 12, 'Commerce'),
('Economics', 'ECON12', 12, 'Commerce'),
('Mathematics', 'MATH12C', 12, 'Commerce'),
('Mathematical Literacy', 'MLIT12C', 12, 'Commerce'),

-- Tourism Stream (Grade 10-12) - Includes Geography, Tourism, Math Lit
('Tourism', 'TOUR10', 10, 'Tourism'),
('Geography', 'GEOG10T', 10, 'Tourism'),
('Mathematical Literacy', 'MLIT10', 10, 'Tourism'),
('Tourism', 'TOUR11', 11, 'Tourism'),
('Geography', 'GEOG11T', 11, 'Tourism'),
('Mathematical Literacy', 'MLIT11', 11, 'Tourism'),
('Tourism', 'TOUR12', 12, 'Tourism'),
('Geography', 'GEOG12T', 12, 'Tourism'),
('Mathematical Literacy', 'MLIT12', 12, 'Tourism'),

-- Compulsory Core Subjects (All Streams)
('English FAL', 'ENGF10', 10, 'General'),
('Home Language', 'HMLG10', 10, 'General'),
('Life Orientation', 'LFOR10', 10, 'General'),
('English FAL', 'ENGF11', 11, 'General'),
('Home Language', 'HMLG11', 11, 'General'),
('Life Orientation', 'LFOR11', 11, 'General'),
('English FAL', 'ENGF12', 12, 'General'),
('Home Language', 'HMLG12', 12, 'General'),
('Life Orientation', 'LFOR12', 12, 'General'),

-- Grade 8-9 General Curriculum
('English FAL', 'ENGF08', 8, 'General'),
('Home Language', 'HMLG08', 8, 'General'),
('Mathematics', 'MATH08', 8, 'General'),
('Natural Sciences', 'NSCI08', 8, 'General'),
('Social Sciences', 'SSCI08', 8, 'General'),
('EMS', 'EMSC08', 8, 'General'),
('Technology', 'TECH08', 8, 'General'),
('Life Orientation', 'LFOR08', 8, 'General'),
('Creative Arts', 'CRTA08', 8, 'General'),

('English FAL', 'ENGF09', 9, 'General'),
('Home Language', 'HMLG09', 9, 'General'),
('Mathematics', 'MATH09', 9, 'General'),
('Natural Sciences', 'NSCI09', 9, 'General'),
('Social Sciences', 'SSCI09', 9, 'General'),
('EMS', 'EMSC09', 9, 'General'),
('Technology', 'TECH09', 9, 'General'),
('Life Orientation', 'LFOR09', 9, 'General'),
('Creative Arts', 'CRTA09', 9, 'General')
ON CONFLICT (code) DO NOTHING;


SELECT *
FROM children;


CREATE TABLE children
  (id SERIAL PRIMARY KEY,
   learner_user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
   full_name VARCHAR(255),
   surname VARCHAR(255),
   parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
   learner_number VARCHAR(20) UNIQUE NOT NULL,
   grade INTEGER NOT NULL CHECK (grade BETWEEN 8 AND 12), 
   class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
   stream VARCHAR(50) CHECK (grade < 10 OR stream IN ('Science','Commerce','Tourism')), 
   subjects TEXT[] NOT NULL DEFAULT '{}',
   school_id INTEGER DEFAULT 1,
   home_language VARCHAR(50) DEFAULT 'English',
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Parent-Educator Consultations (PTC slots & direct consultations)
CREATE TABLE IF NOT EXISTS teacher_consultations (
  id SERIAL PRIMARY KEY,
  school_id INTEGER DEFAULT 1,
  teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
  subject VARCHAR(150) DEFAULT 'General Academic Consultation',
  consultation_date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  venue_or_link VARCHAR(255) DEFAULT 'Educator Office / Virtual Room',
  parent_notes TEXT,
  teacher_notes TEXT,
  status VARCHAR(30) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inter-School Competitions & Derby League
CREATE TABLE IF NOT EXISTS inter_school_competitions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  category VARCHAR(50) DEFAULT 'sports',
  home_school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  away_school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  venue VARCHAR(255),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'scheduled',
  trophy_title VARCHAR(255),
  highlights TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  school_id INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Official CAPS Term Academic Report Cards
CREATE TABLE IF NOT EXISTS report_cards (
  id SERIAL PRIMARY KEY,
  school_id INTEGER DEFAULT 1,
  child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL,
  term INTEGER NOT NULL,
  academic_year INTEGER DEFAULT 2026,
  marks_breakdown JSONB DEFAULT '[]'::jsonb,
  overall_average NUMERIC(5,2),
  overall_level INTEGER,
  teacher_comment TEXT,
  principal_comment TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetables (
   id SERIAL PRIMARY KEY,
   name VARCHAR(255) NOT NULL,
   grade INT DEFAULT 10,
   stream VARCHAR(100) DEFAULT 'General',
   timetable_data JSONB NOT NULL,
   status VARCHAR(50) DEFAULT 'draft_teachers',
   is_active BOOLEAN DEFAULT TRUE,
   created_by INT REFERENCES users(id) ON DELETE SET NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timetable_swap_requests (
   id SERIAL PRIMARY KEY,
   timetable_id INT REFERENCES timetables(id) ON DELETE CASCADE,
   class_name VARCHAR(100) NOT NULL,
   requester_teacher_id INT REFERENCES users(id) ON DELETE CASCADE,
   requester_day VARCHAR(50) NOT NULL,
   requester_period VARCHAR(50) NOT NULL,
   requester_subject VARCHAR(100),
   target_teacher_id INT REFERENCES users(id) ON DELETE CASCADE,
   target_day VARCHAR(50) NOT NULL,
   target_period VARCHAR(50) NOT NULL,
   target_subject VARCHAR(100),
   reason TEXT,
   status VARCHAR(50) DEFAULT 'pending',
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
   id SERIAL PRIMARY KEY,
   title VARCHAR(255) NOT NULL,
   description TEXT,
   event_date DATE NOT NULL,
   start_time TIME,
   end_time TIME,
   location VARCHAR(255),
   event_type VARCHAR(50) DEFAULT 'General',
   audience VARCHAR(50) DEFAULT 'all',
   grade_target INT,
   stream_target VARCHAR(100),
   created_by INT REFERENCES users(id) ON DELETE SET NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


SELECT *
FROM users;

select * from employees;


-- SEEDING SAMPLE DATA (Employees & Workload)
-- 1. Master Admin (Global Overseer across all schools) & Dedicated School Admins (Auth Records)
INSERT INTO users (email, password_hash, role_id, school_id, is_superadmin, full_name, surname, id_number, dob, gender, phone, physical_address, country, race, parent_type)
VALUES
       -- Master Superadmin (Monitors entire multi-school ecosystem)
       ('202247878@myturf.ul.ac.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 1, TRUE, 'Tshepho Letlalo', 'Makula', '0209205494088', '2002-09-20', 'male', '0692606618', '556 Mokgobu street, Mankweng A, Polokwane', 'South Africa', 'Black', 'Father'),
       ('admin@fusionhigh.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 1, TRUE, 'Tshepho Letlalo', 'Makula', '0209205494088', '2002-09-20', 'male', '0692606618', 'Polokwane Central, Limpopo, 0700', 'South Africa', 'Black', 'Father'),

       -- School 2: Mountainview Senior Secondary School Admin
       ('admin@mountainviewhigh.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 2, FALSE, 'M. S.', 'Phasha', '7803155494081', '1978-03-15', 'male', '0152671100', 'Mankweng Unit B/C, Polokwane, 0727', 'South Africa', 'Black', 'Father'),

       -- School 3: Makgoka High School Admin
       ('admin@makgoka.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 3, FALSE, 'K. E.', 'Molepo', '8005200494082', '1980-05-20', 'female', '0152660022', 'Maclean Farm, Boyne, Mankweng Area, 0727', 'South Africa', 'Black', 'Mother'),

       -- School 4: Turfloop High School Admin
       ('principal@turfloophigh.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 4, FALSE, 'N. J.', 'Mamabolo', '7508125494083', '1975-08-12', 'male', '0152673300', 'University Road, Turfloop, Mankweng, 0727', 'South Africa', 'Black', 'Father'),

       -- School 5: Hwiti High School Admin
       ('admin@hwiti.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 5, FALSE, 'R. M.', 'Ramokgopa', '7909180494084', '1979-09-18', 'female', '0152674400', '118 Zone 1, Hwiti St, Mankweng/Sovenga, 0727', 'South Africa', 'Black', 'Mother'),

       -- School 6: Ngwana Mohube Secondary School Admin
       ('admin@ngwanamohube.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 6, FALSE, 'S. P.', 'Mohube', '7604105494085', '1976-04-10', 'male', '0152675500', 'Gamphahlele, Seleteng, Limpopo, 0734', 'South Africa', 'Black', 'Father'),

       -- School 7: Fusion Secondary School (Lotus Gardens) Admin
       ('admin@fusionsecondary.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 7, FALSE, 'Tshepo', 'Makola', '8201015494086', '1982-01-01', 'male', '0123730000', '809 Cyme Crescent, Lotus Gardens, Pretoria, 0008', 'South Africa', 'Black', 'Father'),

       -- School 8: Saulridge Secondary School Admin
       ('admin@saulridge.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 8, FALSE, 'K. E.', 'Masemola', '7406225494087', '1974-06-22', 'male', '0123756000', 'Ramokgopa St, Saulsville, Atteridgeville, Pretoria, 0008', 'South Africa', 'Black', 'Father'),

       -- School 9: Phelindaba Secondary School Admin
       ('admin@phelindaba.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 9, FALSE, 'M. T.', 'Sithole', '7709300494088', '1977-09-30', 'female', '0123738100', 'Kgwale St, Atteridgeville, Pretoria, 0008', 'South Africa', 'Black', 'Mother'),

       -- School 10: Flavius Mareka Secondary School Admin
       ('admin@flaviusmareka.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 10, FALSE, 'L. N.', 'Maluleke', '7302145494089', '1973-02-14', 'male', '0123739200', 'Khoza St, Atteridgeville, Pretoria, 0008', 'South Africa', 'Black', 'Father'),

       -- School 11: Dr. W.F. Nkomo Secondary School Admin
       ('admin@wfnkomo.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 11, FALSE, 'D. M.', 'Ndlovu', '7107085494080', '1971-07-08', 'male', '0123757300', '84 Khudu St, Atteridgeville, Pretoria, 0008', 'South Africa', 'Black', 'Father'),

       -- School 12: Hofmeyr Secondary School Admin
       ('admin@hofmeyr.co.za', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'admin'), 12, FALSE, 'S. R.', 'Mogale', '8103250494081', '1981-03-25', 'female', '0123737400', '1 Mngadi and Mafole St, Atteridgeville, Pretoria, 0008', 'South Africa', 'Black', 'Mother'),

       -- Academic Teachers
       ('tbjmaetane1010@gmail.com', '$2a$10$xZ.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'teacher'), 1, FALSE, 'Thabang', 'Maetane', '0208285930086', '2002-08-28', 'male', '0827637087', '123 maetane street', 'South Sudan', 'Black', 'father'),
       ('thapeloleshabane05@gmail.com', '$2a$10$yB.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'teacher'), 1, FALSE, 'Thapelo', 'Leshabane', '0504225825083', '2005-05-22', 'male', '0661420527', '243 Rabothata street', 'South Africa', 'Black', 'Father'),
       ('202256986@myturf.ul.ac.za', '$2a$10$zC.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'teacher'), 1, FALSE, 'Minenhle', 'Dlungwane', '0205101032085', '2002-05-10', 'female', '0711943962', 'PV 8364, Atteridgeville, Pretoria', 'South Africa', 'Black', 'Mother'),
       ('mini.dludlu@gmail.com', '$2a$10$1C.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'teacher'), 1, FALSE, 'Putla', 'Dludlu', '9907311032084', '2002-05-10', 'female', '0711943962', 'PV 8364, Atteridgeville, Pretoria', 'South Africa', 'Black', 'Mother'),
       ('mapula@gmail.com', '$2a$10$2C.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'teacher'), 1, FALSE, 'Mapula', 'Modiba', '9907311032084', '2002-05-10', 'female', '0711943962', 'PV 8364, Atteridgeville, Pretoria', 'South Africa', 'Black', 'Mother')
ON CONFLICT (email) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  school_id = EXCLUDED.school_id,
  is_superadmin = EXCLUDED.is_superadmin,
  full_name = EXCLUDED.full_name,
  surname = EXCLUDED.surname;

--create a new learners in each school who can be linked to their school, 
--stream, Grade, and their home lanhuage
INSERT INTO users (email, password_hash, role_id, school_id, is_active, full_name, surname)
VALUES   ('202526772@fusionhigh.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),1,TRUE, 'Dudu','Mahlangu'),
        ('202533321@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),2,TRUE, 'Thapelo','Leshabane'), 
        ('202534683@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),3,TRUE, 'Matome','Modiba'), 
        ('202536027@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),4,TRUE, 'Thapelo','Leshabane'), 
        ('202524246@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),5,TRUE, 'Lesedi','Letshedi'), 
        ('202524112@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),6,TRUE, 'Kgadi','Mahlangu'), 
        ('202524421@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),7,TRUE, 'Neo','Mamadise'), 
        ('202524220@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),8,TRUE, 'Kgothatsoi','Setshedi'), 
        ('202524243@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),9,TRUE, 'Lesiba','Aphane'), 
        ('202524240@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),10,TRUE, 'Neo','Kgomo'), 
        ('202524001@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),11,TRUE, 'Katlego','Kekana'), 
        ('202524201@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),12,TRUE, 'Mokgethwa','Ramushu'),
        ('202524221@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),1,TRUE, 'Bokang','Lekganyane'),
        ('202524222@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),2,TRUE, 'Motsoaledi','Rangata'),
        ('202524223@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),3,TRUE, 'Mmakgosi','Ramakgwakgwa'),
        ('202524224@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),4,TRUE, 'Lesiba','Makhubela'),
        ('202524225@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),5,TRUE, 'Kgothatso','Malebe'),
        ('202524226@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),6,TRUE, 'Kgomotso','Marule'),
        ('202524227@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),7,TRUE, 'Pinki','Matsapola'),
        ('202524228@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),8,TRUE, 'Lerato','Nkoana'),
        ('202524229@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),9,TRUE, 'Precious','Makola'),
        ('202524230@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),10,TRUE, 'Pinki','Matsapola'),
        ('202524231@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),11,TRUE, 'Lerato','Nkoana'),
        ('202524232@myturf.ul.ac.za','$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7',(SELECT id FROM roles WHERE name = 'learner'),12,TRUE, 'Precious','Makola');
        
--Now we assigne this learners grades, classes and stream and subjects with respect to their school_id

--insert into learners_streams table with the following data:
INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Dudu',
       'Mahlangu',
       NULL,
       '202526772',
       10,
  (SELECT id
   FROM classes
   WHERE name = '10A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '202526772@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 10;


          







-- 2. Create the Employee Profiles (Principals & Teachers)
INSERT INTO employees (user_id, employee_role_id, full_name, surname, department_id, subjects, subject_codes, grades_taught, classes_taught, phone, email, hired_date)
SELECT u.id, er.id, u.full_name, u.surname, d.id, '{}', ARRAY[]::TEXT[], ARRAY[]::INTEGER[], ARRAY[]::TEXT[], u.phone, u.email, '2024-01-15'::DATE
FROM users u
JOIN employee_roles er ON er.name = 'Principal'
JOIN departments d ON d.name = 'Administration'
WHERE u.role_id = (SELECT id FROM roles WHERE name = 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- Insert Thapelo Leshabane as the Mathematics (Science Stream) teacher

INSERT INTO employees (user_id, employee_role_id, full_name, surname, department_id, subjects, subject_codes, grades_taught, classes_taught, phone, email, hired_date)
SELECT u.id,
       er.id,
       u.full_name,
       u.surname,
       d.id, 
       ARRAY['Mathematics'], 
       ARRAY['MATH10S','MATH11S','MATH12S'], 
       ARRAY[10,11,12], 
       ARRAY['10A','11A','12A'], 
       u.phone,
       u.email,
       '2025-07-20'::DATE
FROM users u
JOIN employee_roles er ON er.name = 'teacher'
JOIN departments d ON d.name = 'Academic'
WHERE u.email = 'thapeloleshabane05@gmail.com' ON CONFLICT (user_id) DO NOTHING;

-- Insert Minenhle Dlungwane as the Life Sciences teacher
INSERT INTO employees (user_id, employee_role_id, full_name, surname, department_id, subjects, subject_codes, grades_taught, classes_taught, phone, email, hired_date)
SELECT u.id,
       er.id,
       u.full_name,
       u.surname,
       d.id, 
       ARRAY['Life Sciences'], 
       ARRAY['LFSC10','LFSC11','LFSC12'], 
       ARRAY[10,11,12], 
       ARRAY['10A','11A','12A'], 
       u.phone,
       u.email,
       '2024-05-10'::DATE
FROM users u
JOIN employee_roles er ON er.name = 'teacher'
JOIN departments d ON d.name = 'Academic'
WHERE u.email = '202256986@myturf.ul.ac.za' ON CONFLICT (user_id) DO NOTHING;


SELECT *
FROM users;

Select * from children;


--SEEDING SAMPLE DATA (Unclaimed Learners for Activation)

INSERT INTO users (email, password_hash, role_id, full_name, surname, id_number, dob, gender, phone, country, race)
VALUES ('20250001@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/A.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Jane', 'Walters', '0501014089081', '2005-01-01', 'Female', '0820000001','South Africa', 'White'),
       ('20250002@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/B.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'David', 'Walters', '0502155099082', '2005-02-15', 'Male', '0820000002', 'South Africa', 'White'),
       ('20250003@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/C.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Sarah', 'Walters', '05063003909083', '2005-06-30', 'Female', '0820000003', 'South Africa', 'White'),
       ('20250004@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/D.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Thabelo', 'Ravhura', '0512254109084 ', '2005-12-22', 'Male', '0820000004', 'South Africa', 'Black'),
       ('20250005@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/E.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Lufuno', 'Ravhura', '0603104989085', '2006-03-10', 'Female', '0820000005', 'South Africa', 'Black'),
       ('20250006@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/F.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Don', 'Walters', '0607225119086', '2006-07-22', 'Male', '0820000006', 'South Africa', 'White'),
       ('20250007@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/G.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Thato', 'Leshabane', '0701083809087', '2007-01-08', 'Female', '0820000007', 'South Africa', 'Black'),
       ('20250008@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/H.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Thabang', 'Leshabane', '0709155209088', '2007-09-15', 'Male', '0820000008', 'South Africa', 'Black'),
       ('20250009@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/I.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Tshegofatso', 'Leshabane', '0811185139080', '2008-11-18', 'Male', '0820000009', 'South Africa', 'Black'),
       ('20250010@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/J.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Mpho', 'Ravhura', '0905053919081', '2009-05-05', 'Female', '0820000010', 'South Africa', 'Black'),
       ('20250011@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/K.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Tumi', 'Leshabane', '0912315149082', '2009-12-31', 'Male', '0820000011', 'South Africa', 'Black'),
       ('20250012@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/L.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Ditebogo', 'Ravhura', '1007154039083', '2010-07-15', 'Female', '0820000012', 'South Africa', 'Black'),
       ('20250013@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/M.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Tumelo', 'Makola', '1103013929085', '2011-03-01', 'Female', '0820000013', 'South Africa', 'Black'),
       ('20250014@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/N.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Neo', 'Makola', '1112255169086', '2011-12-25', 'Male', '0820000014', 'South Africa', 'Black'),
       ('20250015@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/O.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Thabo', 'Makola', '1201015189088', '2012-01-01', 'Male', '0820000015', 'South Africa', 'Black'),
       ('20250016@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/P.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Neo', 'Makola', '1209255199087', '2012-09-25', 'Male', '0820000016', 'South Africa', 'Black'),
       ('20250017@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/P.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Junior', 'Tlhaka', '0503124123083', '2005-03-12', 'Female', '0820000016', 'South Africa', 'Black'),
       ('20250018@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/P.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Lesedi', 'Tlhaka', '0607285782084', '2006-07-28', 'male', '0820000016', 'South Africa', 'Black'),
       ('20250019@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/P.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Lethabo', 'Tlhaka', '0811041245081', '2008-11-04', 'Female', '0820000017', 'South Africa', 'Black'),
       ('20250020@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/P.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Boitumelo', 'Tlhaka', '1001196321087', '2010-01-19', 'male', '0820000086', 'South Africa', 'Black'),
       ('20250021@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/P.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Tebogo', 'Tlhaka', '1209230451089', '2012-09-23', 'Female', '0820000087', 'South Africa', 'Black'),
       ('20250022@fusion.high', '$2a$10$wA.Gv1Cj2L8xJ/P.ABcdeu7i9.p1.p2.p3.p4.p5.p6.p7', (SELECT id FROM roles WHERE name = 'learner'), 'Prince', 'Makola', '0503124123083', '2005-03-12', 'Male', '0729391381', 'South Africa', 'Black')
        ON CONFLICT (email) DO NOTHING;
 
      
 

SELECT *
FROM users;


-- SELECT DISTINCT name 
-- FROM subjects 
-- WHERE grade = 10 AND (stream ILIKE 'Science' OR stream = 'General') 
-- ORDER BY name; 


-- Create the corresponding child record, with parent_id as NULL

INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Jane',
       'Walters',
       NULL,
       '20250001',
       10,
  (SELECT id
   FROM classes
   WHERE name = '10A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250001@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 10;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'David',
       'Walters',
       NULL,
       '20250002',
       11,
  (SELECT id
   FROM classes
   WHERE name = '11A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250002@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 11;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Sarah',
       'Walters',
       NULL,
       '20250003',
       12,
  (SELECT id
   FROM classes
   WHERE name = '12A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250003@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 12;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Thabelo',
       'Ravhura',
       NULL,
       '20250004',
       10,
  (SELECT id
   FROM classes
   WHERE name = '10A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250004@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 10;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Lufuno',
       'Ravhura',
       NULL,
       '20250005',
       11,
  (SELECT id
   FROM classes
   WHERE name = '11A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250005@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 11;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Don',
       'Walters',
       NULL,
       '20250006',
       12,
  (SELECT id
   FROM classes
   WHERE name = '12A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250006@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 12;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Thato',
       'Leshabane',
       NULL,
       '20250007',
       10,
  (SELECT id
   FROM classes
   WHERE name = '10A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250007@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 10;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Thabang',
       'Leshabane',
       NULL,
       '20250008',
       11,
  (SELECT id
   FROM classes
   WHERE name = '11A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250008@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 11;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Tshegofatso',
       'Leshabane',
       NULL,
       '20250009',
       12,
  (SELECT id
   FROM classes
   WHERE name = '12A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250009@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 12;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Mpho',
       'Ravhura',
       NULL,
       '20250010',
       10,
  (SELECT id
   FROM classes
   WHERE name = '10A'),'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250010@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 10;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Tumi',
       'Leshabane',
       NULL,
       '20250011',
       11,
  (SELECT id
   FROM classes
   WHERE name = '11A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250011@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 11;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Ditebogo',
       'Ravhura',
       NULL,
       '20250012',
       12,
  (SELECT id
   FROM classes
   WHERE name = '12A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250012@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 12;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Tumelo',
       'Makola',
       NULL,
       '20250013',
       10,
  (SELECT id
   FROM classes
   WHERE name = '10A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250013@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 10;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Neo',
       'Makola',
       NULL,
       '20250014',
       11,
  (SELECT id
   FROM classes
   WHERE name = '11A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250014@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 11;

INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Thabo',
       'Makola',
       NULL,
       '20250015',
       12,
  (SELECT id
   FROM classes
   WHERE name = '12A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250015@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 12;


INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Neo',
       'Makola',
       NULL,
       '20250016',
       10,
  (SELECT id
   FROM classes
   WHERE name = '10A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250016@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 10;

  INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Junior',
       'Tlhaka',
       NULL,
       '20250017',
       11,
  (SELECT id
   FROM classes
   WHERE name = '11A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250017@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 11;

  INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Lesedi',
       'Tlhaka',
       NULL,
       '20250018',
       12,
  (SELECT id
   FROM classes
   WHERE name = '12A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250018@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 12;

INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Lethabo',
       'Tlhaka',
       NULL,
       '20250019',
       10,
  (SELECT id
   FROM classes
   WHERE name = '10A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250019@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 10;

  INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Boitumelo',
       'Tlhaka',
       NULL,
       '20250020',
       11,
  (SELECT id
   FROM classes
   WHERE name = '11A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250020@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 11;

  INSERT INTO children (learner_user_id, full_name, surname, parent_id, learner_number, grade, class_id, stream, subjects)
SELECT u.id,
       'Tebogo',
       'Tlhaka',
       NULL,
       '20250021',
       12,
  (SELECT id
   FROM classes
   WHERE name = '12A'), 'Science', ARRAY['Mathematics', 'Physical Sciences', 'Life Sciences', 'English FAL', 'Home Language', 'Life Orientation']
FROM users u
WHERE u.email = '20250021@fusion.high' ON CONFLICT (learner_user_id) DO
  UPDATE
  SET grade = 12;


SELECT *
FROM users;


select *
from children;


select *
from users;


-- Link sample children to sample parents by surname or role
UPDATE children c
SET parent_id = p.id
FROM users p
WHERE p.role_id = (SELECT id FROM roles WHERE name = 'parent')
  AND LOWER(c.surname) = LOWER(p.surname)
  AND c.parent_id IS NULL;

-- ==========================================

CREATE TABLE IF NOT EXISTS progress
  (id SERIAL PRIMARY KEY,
  child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  term VARCHAR(20) DEFAULT 'Term 1',
  grade DECIMAL(5, 2), -- Represents score/percentage
  time_taken_seconds INTEGER, 
  notes TEXT,   
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL, 
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP);


SELECT *
FROM progress;





CREATE TABLE IF NOT EXISTS announcements
  (id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  grade_target INTEGER, 
  stream_target VARCHAR(50),
  subject_target VARCHAR(255),
  class_target VARCHAR(50),
  role_target VARCHAR(50) DEFAULT 'all' CHECK (role_target IN ('all', 'admin', 'parent', 'learner')), 
  is_assignment BOOLEAN DEFAULT FALSE,
  assignment_data JSONB,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);


CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add an index for faster message lookups
CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages (sender_id, recipient_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB;


SELECT *
FROM announcements;


CREATE TABLE IF NOT EXISTS textbooks
  (id SERIAL PRIMARY KEY,
  subject VARCHAR(100) NOT NULL,
  grade INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_published BOOLEAN DEFAULT FALSE);


select *
from textbooks;


CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    subject_name VARCHAR(100),
    attendance_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    recorded_by_teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(child_id, attendance_date, subject_name) -- Ensures one record per learner per date per subject
);

CREATE INDEX IF NOT EXISTS idx_attendance_child_id ON attendance (child_id);



CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    grade INTEGER NOT NULL,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    stream VARCHAR(50),
    total_marks DECIMAL(5, 2) NOT NULL CHECK (total_marks > 0),   
    date_created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(10) NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    recorded_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    instructions TEXT,
    date_due TIMESTAMP WITH TIME ZONE    
);

CREATE TABLE IF NOT EXISTS assessment_results (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT,
    recorded_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assessment_id, child_id) -- Ensures a learner has only one result per assessment
);

CREATE INDEX IF NOT EXISTS idx_assessment_results_child_id ON assessment_results (child_id);



-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_date_class ON attendance (attendance_date, class_id);


-- Logic-supporting Indexes

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));


CREATE INDEX IF NOT EXISTS idx_users_id_number ON users (id_number);


CREATE INDEX IF NOT EXISTS idx_children_learner_number ON children (learner_number);


CREATE INDEX IF NOT EXISTS idx_progress_child_id ON progress (child_id);


CREATE INDEX IF NOT EXISTS idx_children_parent ON children (parent_id);


CREATE INDEX IF NOT EXISTS idx_children_learner_user ON children (learner_user_id);


CREATE INDEX IF NOT EXISTS idx_children_subjects ON children USING GIN (subjects);


CREATE INDEX IF NOT EXISTS idx_employees_user ON employees (user_id);


CREATE INDEX IF NOT EXISTS idx_employees_grades ON employees USING GIN (grades_taught);


CREATE INDEX IF NOT EXISTS idx_announcements_target ON announcements (role_target);


CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0),
    total_marks DECIMAL(5, 2) NOT NULL CHECK (total_marks > 0),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT,
    recorded_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 

SELECT * FROM quizzes;

CREATE INDEX idx_quizzes_child_id ON quizzes (child_id);
CREATE INDEX idx_quizzes_subject_id ON quizzes (subject_id);


CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0),
    total_marks DECIMAL(5, 2) NOT NULL CHECK (total_marks > 0),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT,
    recorded_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_child_id ON assignments (child_id);
CREATE INDEX idx_assignments_subject_id ON assignments (subject_id);


CREATE TABLE tests (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0),
    total_marks DECIMAL(5, 2) NOT NULL CHECK (total_marks > 0),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT,
    recorded_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tests_child_id ON tests (child_id);
CREATE INDEX idx_tests_subject_id ON tests (subject_id);


CREATE TABLE exams (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    score DECIMAL(5, 2) NOT NULL CHECK (score >= 0),
    total_marks DECIMAL(5, 2) NOT NULL CHECK (total_marks > 0),
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT,
    recorded_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exams_child_id ON exams (child_id);
CREATE INDEX idx_exams_subject_id ON exams (subject_id);

-- ==========================================
-- BEHAVIOR INCIDENTS & DISCIPLINARY LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS behavior_incidents (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    incident_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'Low' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    description TEXT NOT NULL,
    action_taken TEXT,
    recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_behavior_incidents_child ON behavior_incidents(child_id);
CREATE INDEX IF NOT EXISTS idx_behavior_incidents_date ON behavior_incidents(incident_date);


-- GENERATED REPORTS HISTORY TABLE
CREATE TABLE IF NOT EXISTS generated_reports (
    id SERIAL PRIMARY KEY,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    generated_by VARCHAR(255) DEFAULT 'Principal Admin',
    generated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    parameters JSONB DEFAULT '{}',
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed sample recent reports
INSERT INTO generated_reports (report_name, report_type, generated_by, created_at)
VALUES
    ('Generate Class Mark Sheets', 'class_mark_sheets', 'Principal Admin', '2026-03-07 17:35:29'),
    ('Subject Performance Summaries', 'subject_performance', 'Principal Admin', '2026-03-07 12:17:12'),
    ('Generate Daily Attendance Logs', 'daily_attendance', 'Principal Admin', '2026-03-06 09:14:05'),
    ('Behavior Incident Summary', 'behavior_summary', 'Principal Admin', '2026-03-05 14:22:00')
ON CONFLICT DO NOTHING;

-- SELECT r.name as role_name 
-- FROM users u 
-- JOIN roles r ON u.role_id = r.id 
-- WHERE u.id = 1;

-- ==========================================================
-- ADMISSIONS & APPLICATIONS MANAGEMENT SYSTEM
-- ==========================================================

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  application_number VARCHAR(50) UNIQUE NOT NULL,
  correction_token VARCHAR(64) UNIQUE,
  status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_ai_review', 'action_required', 'approved', 'rejected', 'enrolled', 'waitlisted')),
  
  -- Learner Information
  first_name VARCHAR(100) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  id_number VARCHAR(20) NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  citizenship VARCHAR(50) DEFAULT 'South Africa',
  phone VARCHAR(20),
  email VARCHAR(255),
  physical_address TEXT NOT NULL,
  grade_applied INTEGER NOT NULL CHECK (grade_applied BETWEEN 8 AND 12),
  stream VARCHAR(50) DEFAULT 'General',
  selected_subjects TEXT[] DEFAULT '{}',
  previous_school VARCHAR(255),
  previous_grade INTEGER,
  transfer_reason TEXT,
  medical_info TEXT,
  special_needs TEXT,

  -- Primary Parent / Guardian (Next of Kin 1)
  primary_parent_name VARCHAR(100) NOT NULL,
  primary_parent_surname VARCHAR(100) NOT NULL,
  primary_parent_relationship VARCHAR(50) NOT NULL,
  primary_parent_id_number VARCHAR(20) NOT NULL,
  primary_parent_phone VARCHAR(20) NOT NULL,
  primary_parent_email VARCHAR(255) NOT NULL,
  primary_parent_address TEXT NOT NULL,
  primary_parent_occupation VARCHAR(100),
  primary_parent_employer VARCHAR(150),

  -- Secondary Parent / Guardian (Next of Kin 2 - Optional)
  has_secondary_parent BOOLEAN DEFAULT FALSE,
  secondary_parent_name VARCHAR(100),
  secondary_parent_surname VARCHAR(100),
  secondary_parent_relationship VARCHAR(50),
  secondary_parent_id_number VARCHAR(20),
  secondary_parent_phone VARCHAR(20),
  secondary_parent_email VARCHAR(255),
  secondary_parent_address TEXT,
  secondary_parent_occupation VARCHAR(100),
  secondary_parent_employer VARCHAR(150),

  -- AI Review & Capacity Tracking
  ai_verification_status VARCHAR(30) DEFAULT 'pending',
  ai_verification_notes JSONB DEFAULT '[]'::jsonb,
  assigned_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  provisional_learner_number VARCHAR(20),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT  * FROM applications;

CREATE TABLE IF NOT EXISTS application_documents (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  ai_confidence_score NUMERIC(5,2) DEFAULT 0,
  ai_extracted_data JSONB DEFAULT '{}'::jsonb,
  issues TEXT[] DEFAULT '{}',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE children ADD COLUMN IF NOT EXISTS secondary_parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE children ADD COLUMN IF NOT EXISTS application_number VARCHAR(50);

CREATE TABLE IF NOT EXISTS parent_children (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  relationship VARCHAR(50) DEFAULT 'Guardian',
  is_primary BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, child_id)
);

-- ==========================================================
-- SCHOOL FEES, INVOICES & PAYMENTS
-- ==========================================================
CREATE TABLE IF NOT EXISTS fee_invoices (
  id SERIAL PRIMARY KEY,
  learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'Tuition',
  term VARCHAR(50) DEFAULT 'Term 3 2026',
  amount NUMERIC(10, 2) NOT NULL,
  paid_amount NUMERIC(10, 2) DEFAULT 0.00,
  balance NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE NOT NULL,
  itemized_breakdown JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES fee_invoices(id) ON DELETE CASCADE,
  learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  payment_reference VARCHAR(100) UNIQUE NOT NULL,
  receipt_number VARCHAR(100) UNIQUE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  gateway_transaction_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'completed',
  payer_name VARCHAR(255),
  payer_email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- TERTIARY BURSARIES & SCHOLARSHIPS
-- ==========================================================
CREATE TABLE IF NOT EXISTS bursaries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sponsor VARCHAR(255) NOT NULL,
  logo_url TEXT,
  category VARCHAR(100) NOT NULL,
  min_aps INTEGER DEFAULT 28,
  min_aggregate_percentage NUMERIC(5,2) DEFAULT 60.00,
  required_subjects JSONB DEFAULT '[]'::jsonb,
  min_subject_percentage JSONB DEFAULT '{}'::jsonb,
  target_fields TEXT[],
  coverage_details TEXT[],
  estimated_annual_value NUMERIC(10, 2) DEFAULT 120000.00,
  eligibility_criteria TEXT,
  household_income_cap VARCHAR(100),
  deadline_date DATE,
  is_open BOOLEAN DEFAULT true,
  application_url TEXT NOT NULL,
  required_documents TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learner_bursaries (
  id SERIAL PRIMARY KEY,
  learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
  bursary_id INTEGER REFERENCES bursaries(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'bookmarked',
  notes TEXT,
  checklist_progress JSONB DEFAULT '{}'::jsonb,
  applied_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(learner_id, bursary_id)
);

-- ==========================================================
-- HOMEWORK & DIGITAL SUBMISSIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS homework_assignments (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(150) NOT NULL,
  grade INTEGER NOT NULL,
  stream VARCHAR(100) DEFAULT 'General',
  due_date DATE NOT NULL,
  due_time VARCHAR(20) DEFAULT '23:59',
  total_marks NUMERIC DEFAULT 50,
  file_url TEXT,
  file_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homework_submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES homework_assignments(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  learner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  file_url TEXT,
  file_name VARCHAR(255),
  submission_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'submitted',
  ai_score NUMERIC,
  ai_percentage NUMERIC,
  ai_feedback TEXT,
  ai_strengths TEXT,
  ai_areas_for_improvement TEXT,
  teacher_score NUMERIC,
  teacher_percentage NUMERIC,
  teacher_feedback TEXT,
  signed_by_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  signed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (assignment_id, child_id)
);

-- ==========================================================
-- ADVANCED SCHOOL MANAGEMENT MODULES
-- ==========================================================
CREATE TABLE IF NOT EXISTS textbook_inventory (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  isbn VARCHAR(50),
  grade INTEGER NOT NULL,
  subject VARCHAR(100) NOT NULL,
  stream VARCHAR(50) DEFAULT 'General',
  total_copies INTEGER NOT NULL DEFAULT 0,
  available_copies INTEGER NOT NULL DEFAULT 0,
  barcode_prefix VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS textbook_allocations (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER NOT NULL REFERENCES textbook_inventory(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  copy_barcode VARCHAR(100) NOT NULL,
  status VARCHAR(30) DEFAULT 'issued',
  issue_date DATE DEFAULT CURRENT_DATE,
  return_due_date DATE,
  returned_date DATE,
  condition_on_issue VARCHAR(50) DEFAULT 'Good',
  condition_on_return VARCHAR(50),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id SERIAL PRIMARY KEY,
  exam_name VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  grade INTEGER NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue VARCHAR(100) NOT NULL,
  total_seats INTEGER NOT NULL DEFAULT 50,
  invigilator_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_seating_allocations (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  desk_number VARCHAR(20) NOT NULL,
  attendance_status VARCHAR(20) DEFAULT 'unconfirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, desk_number),
  UNIQUE(session_id, child_id)
);

CREATE TABLE IF NOT EXISTS extracurricular_activities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  coach_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  practice_days TEXT[] DEFAULT '{}',
  venue VARCHAR(150),
  season VARCHAR(50) DEFAULT 'Annual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS extracurricular_members (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES extracurricular_activities(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'Member',
  joined_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(activity_id, child_id)
);

CREATE TABLE IF NOT EXISTS extracurricular_events (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES extracurricular_activities(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  opponent VARCHAR(150),
  event_date DATE NOT NULL,
  event_time TIME,
  location VARCHAR(200),
  result_summary VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS educator_leave_requests (
  id SERIAL PRIMARY KEY,
  teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(60) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(30) DEFAULT 'pending',
  relief_status VARCHAR(30) DEFAULT 'unassigned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS educator_relief_allocations (
  id SERIAL PRIMARY KEY,
  leave_request_id INTEGER NOT NULL REFERENCES educator_leave_requests(id) ON DELETE CASCADE,
  relief_teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  class_name VARCHAR(50),
  subject_name VARCHAR(100),
  period VARCHAR(50),
  relief_date DATE NOT NULL,
  notes TEXT,
  status VARCHAR(30) DEFAULT 'assigned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ptc_slots (
  id SERIAL PRIMARY KEY,
  teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(30) DEFAULT 'available',
  venue VARCHAR(100) DEFAULT 'Classroom / Online',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ptc_bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES ptc_slots(id) ON DELETE CASCADE,
  parent_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  meeting_notes TEXT,
  status VARCHAR(30) DEFAULT 'booked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conduct_logs (
  id SERIAL PRIMARY KEY,
  child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  incident_type VARCHAR(100) NOT NULL,
  severity VARCHAR(30) DEFAULT 'minor',
  description TEXT NOT NULL,
  action_taken TEXT,
  merit_demerit_points INTEGER DEFAULT 0,
  incident_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'announcement',
  target_tab VARCHAR(50) DEFAULT 'announcements',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marks (
  id SERIAL PRIMARY KEY,
  learner_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  subject_name VARCHAR(100),
  term INTEGER DEFAULT 1,
  mark_type VARCHAR(50) DEFAULT 'Test',
  score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) DEFAULT 100.00,
  weight NUMERIC(3,2) DEFAULT 1.0,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
