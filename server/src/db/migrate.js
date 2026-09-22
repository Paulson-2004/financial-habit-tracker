import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pool, closePool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/src/db -> repository root -> database/migrations
export const MIGRATIONS_DIR = path.resolve(__dirname, '../../../database/migrations');

// Arbitrary constant: serializes concurrent runs (e.g. two instances starting at once).
const ADVISORY_LOCK_KEY = 727001;

/**
 * Applies every unapplied `NNN_description.sql` file in order.
 * Each file runs in its own transaction and is recorded in schema_migrations.
 * Applied files are never re-run, so never edit a migration that has been applied anywhere shared.
 */
export async function runMigrations({ dir = MIGRATIONS_DIR, log = console.log } = {}) {
  const files = (await fs.readdir(dir)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         filename   TEXT        PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.filename));
    let appliedCount = 0;

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = await fs.readFile(path.join(dir, file), 'utf8');
      log(`Applying ${file} ...`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        error.message = `Migration ${file} failed: ${error.message}`;
        throw error;
      }
      appliedCount += 1;
    }

    log(appliedCount > 0 ? `Applied ${appliedCount} migration(s).` : 'Database is up to date.');
    return appliedCount;
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    } finally {
      client.release();
    }
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  runMigrations()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(closePool);
}
