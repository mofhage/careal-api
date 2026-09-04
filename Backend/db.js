// db.js – full replacement
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // ← Required for Supabase pooler self-signed cert
  }
});

// ── Error handler on the pool itself — REQUIRED. ──────────────────────────
// Without this, any background connection error (e.g. the pooler dropping
// an idle client — routine with Supabase's Transaction pooler, which
// recycles connections more aggressively than a direct connection) emits
// an unhandled 'error' event, which Node treats as fatal and crashes the
// whole process, even though every in-flight request was otherwise fine.
// This just logs it — the pool automatically replaces the dropped client
// on the next query, no other code needs to change.
pool.on('error', (err) => {
  console.error('⚠️  Unexpected error on idle Postgres client:', err.message);
});

// Log connection attempts
pool.connect()
  .then(() => console.log('✅ Connected to Supabase (pooler mode)'))
  .catch(err => console.error('❌ Connection failed:', err.message));

export default pool;
