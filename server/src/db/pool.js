import pg from 'pg';
import { env } from '../config/env.js';
import { camelizeKeys } from '../utils/camelize.js';

const { Pool, types } = pg;

// Type parsers - do not remove:
//  * NUMERIC (1700) would arrive as strings; money is NUMERIC(14,2), so a JS number is exact enough.
//  * DATE (1082) would become a JS Date and shift across timezones; keep 'YYYY-MM-DD' strings.
//  * BIGINT (20), returned by COUNT(*), would arrive as a string.
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));
types.setTypeParser(1082, (value) => value);
types.setTypeParser(20, (value) => (value === null ? null : Number(value)));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  // Generous: free hosted databases can be slow to wake up.
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (error) => {
  // An idle client errored (e.g. the database restarted). Log it; the pool replaces the client.
  if (!env.isTest) console.error('Unexpected PostgreSQL pool error:', error.message);
});

function withCamelCase(execute) {
  return async (text, params) => {
    const result = await execute(text, params);
    return { rows: result.rows.map(camelizeKeys), rowCount: result.rowCount };
  };
}

/**
 * Runs one parameterized statement. ALWAYS pass user input through `params` ($1, $2, ...).
 * Returns { rows, rowCount } with camelCase row keys.
 */
export const query = withCamelCase((text, params) => pool.query(text, params));

/**
 * Runs `fn(tx)` inside BEGIN/COMMIT (ROLLBACK on error). `tx` has the same signature as `query`
 * and must be used for every statement that belongs to the transaction.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  const tx = withCamelCase((text, params) => client.query(text, params));
  try {
    await client.query('BEGIN');
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
