const { Pool, types } = require('pg');
require('dotenv').config();

// Ensure PostgreSQL DATE columns (OID 1082) return exact 'YYYY-MM-DD' strings to prevent timezone shifting
types.setTypeParser(1082, (val) => val);

let connectionString = process.env.DATABASE_URL;
let ssl = false;

if (connectionString) {
  // Remove sslmode query parameter so pg driver respects rejectUnauthorized: false on cloud hosts (Supabase, Neon, AWS RDS)
  connectionString = connectionString.replace(/[?&]sslmode=[^&]+/, '').replace(/\?$/, '');
  ssl = (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'))
    ? false
    : { rejectUnauthorized: false };
}

const poolConfig = connectionString
  ? {
      connectionString,
      ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: (process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST) || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'FUSION_DB',
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.warn('[DATABASE WARNING] Idle client connection reset/error (reconnecting):', err.message);
});

// Test the database connection once on module initialization
pool.connect((err, client, release) => {
    if (err) {
        console.error('FATAL: Could not connect to the database. Connection Error:', err.message);
        return;
    }
    console.log('Database connection successful.');
    release();
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool // Exporting pool for transaction and advisory lock support
};