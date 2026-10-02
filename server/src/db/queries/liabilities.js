import { query } from '../pool.js';

// Ownership pattern: every query filters by user_id directly (AGENTS.md section 5).
const COLUMNS = 'id, user_id, name, category, amount, description, created_at, updated_at';

// Fixed whitelist, never built from request keys directly - same pattern as
// db/queries/assets.js and db/queries/profiles.js.
const UPDATABLE_COLUMNS = { name: 'name', category: 'category', amount: 'amount', description: 'description' };

export async function listLiabilities(userId, exec = query) {
  const { rows } = await exec(`SELECT ${COLUMNS} FROM liabilities WHERE user_id = $1 ORDER BY created_at`, [userId]);
  return rows;
}

export async function findLiabilityById(userId, id, exec = query) {
  const { rows } = await exec(`SELECT ${COLUMNS} FROM liabilities WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] ?? null;
}

export async function insertLiability(userId, { name, category, amount, description }, exec = query) {
  const { rows } = await exec(
    `INSERT INTO liabilities (user_id, name, category, amount, description)
     VALUES ($1, $2, COALESCE($3, 'other'), $4, $5)
     RETURNING ${COLUMNS}`,
    [userId, name, category ?? null, amount, description ?? null],
  );
  return rows[0];
}

/**
 * PATCH semantics: only the keys present in `updates` are changed (see
 * validators/liabilityValidators.js#updateLiabilitySchema - at least one key is
 * guaranteed). Returns the updated row, or null if it doesn't exist or belongs to
 * another user.
 */
export async function updateLiabilityById(userId, id, updates, exec = query) {
  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (!(key in updates)) continue;
    params.push(updates[key]);
    setClauses.push(`${column} = $${params.length}`);
  }

  params.push(id, userId);
  const { rows } = await exec(
    `UPDATE liabilities SET ${setClauses.join(', ')}, updated_at = now()
     WHERE id = $${params.length - 1} AND user_id = $${params.length}
     RETURNING ${COLUMNS}`,
    params,
  );
  return rows[0] ?? null;
}

/** Returns true if a row belonging to this user was deleted. */
export async function deleteLiabilityById(userId, id, exec = query) {
  const { rowCount } = await exec('DELETE FROM liabilities WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}
