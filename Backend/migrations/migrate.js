// migrations/migrate.js
// Terminal migration runner — no ORM, uses the same pg Pool as everything
// else. Applies any .sql file in this folder that hasn't run yet, in
// filename order (which is why they're numbered 002_, 003_, 004_...),
// tracked in a schema_migrations table so re-running is always safe.
//
// Usage:
//   node migrations/migrate.js
// or, after the package.json update in this package:
//   npm run migrate
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      filename    TEXT UNIQUE NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const applied = await pool.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.rows.map((r) => r.filename));

  const files = fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // numeric prefixes (002_, 003_...) sort correctly as plain strings

  const pending = files.filter((f) => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log('No pending migrations — database is up to date.');
    await pool.end();
    return;
  }

  console.log(`Found ${pending.length} pending migration(s): ${pending.join(', ')}`);

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql); // multi-statement — fine, these files don't use $1 params
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✓ Applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✗ Failed on ${file}: ${err.message}`);
      console.error('Stopped — fix the migration above and re-run. Earlier migrations already applied are unaffected.');
      client.release();
      await pool.end();
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log('All pending migrations applied.');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration runner crashed:', err.message);
  process.exit(1);
});
