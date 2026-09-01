const db = require('./db');

async function createParentApplicationsTable() {
    try {
        console.log('[DB SETUP] Ensuring parent_portal_applications table exists...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS parent_portal_applications (
                id SERIAL PRIMARY KEY,
                application_number VARCHAR(50) UNIQUE NOT NULL,
                school_id INTEGER REFERENCES schools(id) DEFAULT 1,
                parent_name VARCHAR(255) NOT NULL,
                parent_surname VARCHAR(255) NOT NULL,
                parent_id_number VARCHAR(20) NOT NULL,
                parent_email VARCHAR(255) NOT NULL,
                parent_phone VARCHAR(50) NOT NULL,
                physical_address TEXT NOT NULL,
                parent_type VARCHAR(50) DEFAULT 'Parent',
                password_hash TEXT NOT NULL,
                dob DATE,
                gender VARCHAR(20),
                country VARCHAR(100) DEFAULT 'South Africa',
                race VARCHAR(50) DEFAULT 'Black',
                child_first_name VARCHAR(255),
                child_surname VARCHAR(255),
                child_id_number VARCHAR(20),
                child_grade INTEGER,
                child_stream VARCHAR(50) DEFAULT 'General',
                children_details JSONB DEFAULT '[]'::jsonb,
                is_twins_or_multiple BOOLEAN DEFAULT FALSE,
                num_children INTEGER DEFAULT 1,
                status VARCHAR(50) DEFAULT 'pending',
                admin_notes TEXT,
                reviewed_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_parent_apps_school_status ON parent_portal_applications(school_id, status);
            CREATE INDEX IF NOT EXISTS idx_parent_apps_email ON parent_portal_applications(parent_email);
            CREATE INDEX IF NOT EXISTS idx_parent_apps_child_id ON parent_portal_applications(child_id_number);
        `);
        console.log('[DB SETUP SUCCESS] parent_portal_applications table is ready.');
    } catch (err) {
        console.error('[DB SETUP ERROR] Failed to create parent_portal_applications table:', err.message);
        throw err;
    }
}

if (require.main === module) {
    createParentApplicationsTable()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { createParentApplicationsTable };
