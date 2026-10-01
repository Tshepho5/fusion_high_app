/**
 * Migration: Geleza SA AI Performance & Intervention Tables
 * 
 * 1. Adds school_type to schools table.
 * 2. Creates learner_performance_profiles table (stores study habits, tutoring, resources, etc.)
 * 3. Creates ai_performance_predictions table (stores historical risk tier snapshots & predictions)
 * 4. Seeds baseline performance profiles for existing children.
 */

const db = require('../db/db');

async function runMigration() {
  console.log('🚀 Starting Geleza SA Performance Factor Database Migration...');

  try {
    // 1. Add school_type column to schools table
    await db.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_type VARCHAR(50) DEFAULT 'Public';
      UPDATE schools SET school_type = 'Public' WHERE school_type IS NULL;
    `);
    console.log('✅ Added school_type column to schools table.');

    // 2. Create learner_performance_profiles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS learner_performance_profiles (
        id SERIAL PRIMARY KEY,
        child_id INTEGER UNIQUE NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        weekly_hours_studied NUMERIC(4,1) DEFAULT 18.0,
        tutoring_sessions INTEGER DEFAULT 1,
        access_to_resources VARCHAR(20) DEFAULT 'Medium' CHECK (access_to_resources IN ('Low', 'Medium', 'High')),
        internet_access BOOLEAN DEFAULT TRUE,
        motivation_level VARCHAR(20) DEFAULT 'Medium' CHECK (motivation_level IN ('Low', 'Medium', 'High')),
        peer_influence VARCHAR(20) DEFAULT 'Positive' CHECK (peer_influence IN ('Negative', 'Neutral', 'Positive')),
        family_income VARCHAR(20) DEFAULT 'Medium' CHECK (family_income IN ('Low', 'Medium', 'High')),
        learning_disabilities BOOLEAN DEFAULT FALSE,
        parental_involvement VARCHAR(20) DEFAULT 'Medium' CHECK (parental_involvement IN ('Low', 'Medium', 'High')),
        parental_education_level VARCHAR(50) DEFAULT 'High School' CHECK (parental_education_level IN ('High School', 'College', 'Postgraduate')),
        distance_from_home VARCHAR(20) DEFAULT 'Near' CHECK (distance_from_home IN ('Near', 'Moderate', 'Far')),
        teacher_quality VARCHAR(20) DEFAULT 'High' CHECK (teacher_quality IN ('Low', 'Medium', 'High')),
        notes TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_perf_profiles_child_id ON learner_performance_profiles(child_id);
    `);
    console.log('✅ Created learner_performance_profiles table & index.');

    // 3. Create ai_performance_predictions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_performance_predictions (
        id SERIAL PRIMARY KEY,
        child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
        academic_year INTEGER NOT NULL DEFAULT 2026,
        term INTEGER NOT NULL DEFAULT 1 CHECK (term BETWEEN 1 AND 4),
        predicted_score NUMERIC(5,2) NOT NULL,
        risk_tier_id INTEGER NOT NULL CHECK (risk_tier_id IN (0, 1, 2)),
        risk_tier_label VARCHAR(50) NOT NULL,
        risk_tier_color VARCHAR(20) NOT NULL,
        confidence_probabilities JSONB DEFAULT '{}'::jsonb,
        actionable_nudges TEXT[] DEFAULT '{}',
        features_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        evaluated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ai_predictions_child_id ON ai_performance_predictions(child_id);
      CREATE INDEX IF NOT EXISTS idx_ai_predictions_school_term ON ai_performance_predictions(school_id, academic_year, term);
      CREATE INDEX IF NOT EXISTS idx_ai_predictions_tier ON ai_performance_predictions(risk_tier_id);
    `);
    console.log('✅ Created ai_performance_predictions table & indices.');

    // 4. Seed baseline profiles for existing children
    const insertRes = await db.query(`
      INSERT INTO learner_performance_profiles (child_id, weekly_hours_studied, tutoring_sessions, access_to_resources, internet_access, motivation_level, peer_influence, family_income, parental_involvement, teacher_quality)
      SELECT c.id, 18.0, 1, 'Medium', TRUE, 'Medium', 'Positive', 'Medium', 'Medium', 'High'
      FROM children c
      WHERE NOT EXISTS (
        SELECT 1 FROM learner_performance_profiles WHERE child_id = c.id
      )
      ON CONFLICT (child_id) DO NOTHING;
    `);
    console.log(`✅ Seeded baseline study profiles for ${insertRes.rowCount || 0} existing children.`);

    console.log('🎉 Geleza SA Performance Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
