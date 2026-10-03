// server/db.js – Local PostgreSQL Connection
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Local PostgreSQL configuration
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pointzplus',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  // Log instead of exiting: a single idle-client error must not kill the API.
  console.error('Unexpected error on idle client', err);
});

// Test connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL connected:', result.rows[0].now);
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
    return false;
  }
}

// Helper for parameterized queries
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Per-query logging is gated behind DEBUG_SQL to avoid prod log spam (guardrail §4).
    if (process.env.DEBUG_SQL === '1') {
      console.log('Executed query', {
        text: text.substring(0, 50),
        duration,
        rows: res.rowCount,
      });
    }
    return res;
  } catch (err) {
    console.error('Query error:', err.message);
    throw err;
  }
}

export default { pool, query, testConnection };