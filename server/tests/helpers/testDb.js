// Integration tests need a real PostgreSQL database. They are opt-in via TEST_DATABASE_URL
// so `npm test` still runs the unit suite with zero setup (see vitest.config.js and README).
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
  const { pool } = await import('../../src/db/pool.js');
  const { runSqlSeeds } = await import('../../src/db/seed.js');
  const { runMigrations } = await import('../../src/db/migrate.js');

  await runMigrations({ log: () => {} });
  // CASCADE handles the FK order (transactions/feedback/habits/goals/assets/liabilities
  // -> users, etc) regardless of the list order below, so this stays correct as new
  // user-owned tables are added. habit_completions, goal_contributions, and
  // net_worth_snapshots cascade from their parents and don't need to be listed separately
  // (net_worth_snapshots has no child anyway, but is included since it isn't a child of
  // any table already listed).
  await pool.query(
    `TRUNCATE TABLE transactions, feedback, categories, habits, savings_goals,
              assets, liabilities, net_worth_snapshots,
              financial_profiles, users RESTART IDENTITY CASCADE`,
  );
  // Re-seed system categories (same database/seeds/*.sql the real `npm run seed` uses),
  // since transaction tests need at least one real income and expense category to exist.
  await runSqlSeeds();
}
