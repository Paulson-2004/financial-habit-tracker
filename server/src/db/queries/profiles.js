import { query } from '../pool.js';

// financial_profiles is 1:1 with users (see database/migrations/001_create_users.sql).
// A row always exists once a user has registered (created in the same transaction as the
// user - see db/queries/users.js's insertDefaultProfile), so these never need an upsert.

const COLUMNS = 'user_id, currency, occupation, monthly_budget, monthly_savings_target, updated_at';

// Maps a validated updateProfileSchema payload's camelCase keys to their SQL columns.
// A fixed whitelist, never built from request keys directly, so this can never become
// a SQL-injection vector no matter what the client sends.
const UPDATABLE_COLUMNS = {
  currency: 'currency',
  occupation: 'occupation',
  monthlyBudget: 'monthly_budget',
  monthlySavingsTarget: 'monthly_savings_target',
};

export async function findProfileByUserId(userId, exec = query) {
  const { rows } = await exec(`SELECT ${COLUMNS} FROM financial_profiles WHERE user_id = $1`, [userId]);
  return rows[0] ?? null;
}

/** `updates` is the already-Zod-validated body of PATCH /api/users/me. */
export async function updateProfile(userId, updates, exec = query) {
  const setClauses = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (!(key in updates)) continue;
    params.push(updates[key]);
    setClauses.push(`${column} = $${params.length}`);
  }

  params.push(userId);
  const { rows } = await exec(
    `UPDATE financial_profiles SET ${setClauses.join(', ')}, updated_at = now()
     WHERE user_id = $${params.length}
     RETURNING ${COLUMNS}`,
    params,
  );
  return rows[0] ?? null;
}
