import { query } from '../pool.js';

// Ownership pattern: every query filters by user_id directly (AGENTS.md section 5).
const COLUMNS = 'id, user_id, name, category, value, description, created_at, updated_at';

// Fixed whitelist, never built from request keys directly, so this can never become a
// SQL-injection vector no matter what the client sends - same pattern as
// db/queries/profiles.js.
const UPDATABLE_COLUMNS = { name: 'name', category: 'category', value: 'value', description: 'description' };

export async function listAssets(userId, exec = query) {
  const { rows } = await exec(`SELECT ${COLUMNS} FROM assets WHERE user_id = $1 ORDER BY created_at`, [userId]);
  return rows;
}

export async function findAssetById(userId, id, exec = query) {
  const { rows } = await exec(`SELECT ${COLUMNS} FROM assets WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] ?? null;
}

export async function insertAsset(userId, { name, category, value, description }, exec = query) {
  const { rows } = await exec(
    `INSERT INTO assets (user_id, name, category, value, description)
     VALUES ($1, $2, COALESCE($3, 'other'), $4, $5)
     RETURNING ${COLUMNS}`,
    [userId, name, category ?? null, value, description ?? null],
  );
  return rows[0];
}

/**
 * PATCH semantics: only the keys present in `updates` are changed (see
 * validators/assetValidators.js#updateAssetSchema - at least one key is guaranteed).
 * Returns the updated row, or null if it doesn't exist or belongs to another user.
 */
export async function updateAssetById(userId, id, updates, exec = query) {
  const setClauses = [];
  const params = [];
  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (!(key in updates)) continue;
    params.push(updates[key]);
    setClauses.push(`${column} = $${params.length}`);
  }

  params.push(id, userId);
  const { rows } = await exec(
    `UPDATE assets SET ${setClauses.join(', ')}, updated_at = now()
     WHERE id = $${params.length - 1} AND user_id = $${params.length}
     RETURNING ${COLUMNS}`,
    params,
  );
  return rows[0] ?? null;
}

/** Returns true if a row belonging to this user was deleted. */
export async function deleteAssetById(userId, id, exec = query) {
  const { rowCount } = await exec('DELETE FROM assets WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}
