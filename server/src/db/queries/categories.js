import { query } from '../pool.js';

const COLUMNS = 'id, user_id, name, type, color';

/** System categories (user_id IS NULL) plus this user's own, if any exist. */
export async function listCategories(userId, { type } = {}, exec = query) {
  const params = [userId];
  let sql = `SELECT ${COLUMNS} FROM categories WHERE (user_id IS NULL OR user_id = $1)`;

  if (type) {
    params.push(type);
    sql += ` AND type = $${params.length}`;
  }
  sql += ' ORDER BY type, name';

  const { rows } = await exec(sql, params);
  return rows;
}

/** A category this user is allowed to use: a system category, or (later) their own. */
export async function findUsableCategory(categoryId, userId, exec = query) {
  const { rows } = await exec(
    `SELECT ${COLUMNS} FROM categories WHERE id = $1 AND (user_id IS NULL OR user_id = $2)`,
    [categoryId, userId],
  );
  return rows[0] ?? null;
}
