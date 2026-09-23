import { query } from '../pool.js';

// Same ownership pattern as db/queries/transactions.js: every statement filters by
// user_id, and admin_note/status are never selected here (they belong to the Day 5
// admin module - see database/migrations/002_create_financial_ledger.sql).
const COLUMNS = 'id, user_id, type, subject, message, status, created_at, updated_at';

export async function insertFeedback(userId, { type, subject, message }, exec = query) {
  const { rows } = await exec(
    `INSERT INTO feedback (user_id, type, subject, message)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [userId, type, subject, message],
  );
  return rows[0];
}

export async function findFeedbackById(userId, id, exec = query) {
  const { rows } = await exec(`SELECT ${COLUMNS} FROM feedback WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] ?? null;
}

export async function listFeedbackByUser(userId, { page, pageSize }, exec = query) {
  const offset = (page - 1) * pageSize;
  const [{ rows }, { rows: countRows }] = await Promise.all([
    exec(
      `SELECT ${COLUMNS} FROM feedback WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset],
    ),
    exec('SELECT COUNT(*) AS total FROM feedback WHERE user_id = $1', [userId]),
  ]);
  return { rows, total: countRows[0].total };
}
