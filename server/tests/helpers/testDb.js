export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

if (hasTestDatabase) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DATABASE_SSL = process.env.TEST_DATABASE_SSL ?? 'false';

  // Hard safety check: TRUNCATE below must never be able to reach a real database.
  if (!/test/i.test(process.env.DATABASE_URL)) {
    throw new Error('TEST_DATABASE_URL must reference a database with "test" in its name.');
  }
}

export async function resetTestDatabase() {
  const { runMigrations } = await import('../../src/db/migrate.js');
  const { pool } = await import('../../src/db/pool.js');
  await runMigrations({ log: () => {} });
  await pool.query('TRUNCATE TABLE financial_profiles, users RESTART IDENTITY CASCADE');
}
