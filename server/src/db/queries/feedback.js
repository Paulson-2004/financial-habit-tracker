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

// ---------------------------------------------------------------------------
// Admin queries (Day 5). These intentionally ignore user_id and join the author
// as safe metadata (id/name/email only) - they run only behind requireRole('admin').
// ---------------------------------------------------------------------------

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const ADMIN_COLUMNS = `
  f.id, f.user_id, f.type, f.subject, f.message, f.status, f.admin_note,
  f.created_at, f.updated_at,
  u.name AS author_name, u.email AS author_email`;

function buildAdminFilters({ status, type, search } = {}) {
  const params = [];
  const clauses = [];

  if (status) {
    params.push(status);
    clauses.push(`f.status = $${params.length}`);
  }
  if (type) {
    params.push(type);
    clauses.push(`f.type = $${params.length}`);
  }
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    clauses.push(`(f.subject ILIKE $${params.length} ESCAPE '\\' OR f.message ILIKE $${params.length} ESCAPE '\\')`);
  }

  return { whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export async function listAllFeedback({ page, pageSize, status, type, search }, exec = query) {
  const { whereSql, params } = buildAdminFilters({ status, type, search });
  const offset = (page - 1) * pageSize;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    exec(
      `SELECT ${ADMIN_COLUMNS} FROM feedback f JOIN users u ON u.id = f.user_id
       ${whereSql} ORDER BY f.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset],
    ),
    exec(`SELECT COUNT(*) AS total FROM feedback f ${whereSql}`, params),
  ]);
  return { rows, total: countRows[0].total };
}

export async function findAnyFeedbackById(id, exec = query) {
  const { rows } = await exec(
    `SELECT ${ADMIN_COLUMNS} FROM feedback f JOIN users u ON u.id = f.user_id WHERE f.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function updateFeedbackByAdmin(id, { status, adminNote }, exec = query) {
  const sets = ['updated_at = now()'];
  const params = [id];

  if (status !== undefined) {
    params.push(status);
    sets.push(`status = $${params.length}`);
  }
  if (adminNote !== undefined) {
    params.push(adminNote);
    sets.push(`admin_note = $${params.length}`);
  }

  const { rows } = await exec(
    `UPDATE feedback SET ${sets.join(', ')} WHERE id = $1
     RETURNING id, user_id, type, subject, message, status, admin_note, created_at, updated_at`,
    params,
  );
  return rows[0] ?? null;
}
