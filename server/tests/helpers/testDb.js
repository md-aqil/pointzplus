// server/tests/helpers/testDb.js
//
// Boots an isolated PostgreSQL database for the DB-backed tests.
//
// Two hard requirements shape this:
//   1. It must never touch the developer's real `pointzplus` database. The
//      repository inserts rows on purpose (a new program is registered when an
//      unknown sender is seen), so running against the dev DB would pollute it.
//   2. The schema must be the real one, not a hand-written stub — otherwise the
//      tests would pass against a schema production never uses. So we replay the
//      actual migration files in order.
//
// Usage: call useTestDatabase() BEFORE importing db.js / any repository,
// because db.js creates its pool at import time from process.env.DB_NAME.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, '..', '..', 'db', 'migrations');

export const TEST_DB = process.env.TEST_DB_NAME || 'pointzplus_test';

function psql(database, sql) {
  return execFileSync('psql', ['-d', database, '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

/** True when the local Postgres accepts a connection (tests skip otherwise). */
export function canReachPostgres() {
  try {
    psql('postgres', 'SELECT 1;');
    return true;
  } catch {
    return false;
  }
}

/**
 * Point the app's connection pool at the test database.
 * Must run before `db.js` is first imported.
 */
export function useTestDatabase() {
  process.env.DB_NAME = TEST_DB;
  // Stops dotenv (invoked by db.js) from overwriting DB_NAME with the .env value.
  process.env.DOTENV_CONFIG_OVERRIDE = 'true';
}

/** Drop and recreate the test database, then apply every migration in order. */
export function resetTestDatabase() {
  // Terminate stragglers so DROP cannot be blocked by an open connection.
  psql(
    'postgres',
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid();`
  );
  psql('postgres', `DROP DATABASE IF EXISTS ${TEST_DB};`);
  psql('postgres', `CREATE DATABASE ${TEST_DB};`);

  // Zero-padded date prefixes keep sort() in application order.
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    psql(TEST_DB, readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }

  return { database: TEST_DB, migrationsApplied: files.length };
}
