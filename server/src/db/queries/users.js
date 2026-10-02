import { query } from '../pool.js';

// All SQL for the users / financial_profiles tables lives here.
// Every function accepts an optional `exec` (defaults to the pool) so it can run inside withTransaction.
// PUBLIC_COLUMNS is a constant, never user input, so interpolating it is safe.
const PUBLIC_COLUMNS = 'id, name, email, role, is_active, last_login_at, created_at';

export async function findUserByEmail(email, exec = query) {
  const { rows } = await exec(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id, exec = query) {
  const { rows } = await exec(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function insertUser({ name, email, passwordHash, role = 'user' }, exec = query) {
  const { rows } = await exec(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash, role],
  );
  return rows[0];
}

export async function insertDefaultProfile(userId, exec = query) {
  await exec('INSERT INTO financial_profiles (user_id) VALUES ($1)', [userId]);
}

export async function touchLastLogin(userId, exec = query) {
  await exec('UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1', [userId]);
}

// Escapes ILIKE's wildcard characters in user-supplied search text (same approach as
// db/queries/transactions.js) so a literal "%" can't widen the match unexpectedly.
function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Admin-only user listing. Returns safe fields only - never password_hash. Filters are
// built from whitelisted values (role enum, isActive 'true'/'false'), never raw input.
export async function listUsers({ page, pageSize, search, role, isActive }, exec = query) {
  const params = [];
  const clauses = [];

  if (role) {
    params.push(role);
    clauses.push(`u.role = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive === 'true');
    clauses.push(`u.is_active = $${params.length}`);
  }
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    clauses.push(`(u.name ILIKE $${params.length} ESCAPE '\\' OR u.email ILIKE $${params.length} ESCAPE '\\')`);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const pageSql = `
    SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login_at, u.created_at
    FROM users u
    ${whereSql}
    ORDER BY u.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const countSql = `SELECT COUNT(*) AS total FROM users u ${whereSql}`;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    exec(pageSql, [...params, pageSize, offset]),
    exec(countSql, params),
  ]);
  return { rows, total: countRows[0].total };
}

export async function updateUserActive(id, isActive, exec = query) {
  const { rows } = await exec(
    `UPDATE users SET is_active = $2, updated_at = now() WHERE id = $1
     RETURNING id, name, email, role, is_active, last_login_at, created_at`,
    [id, isActive],
  );
  return rows[0] ?? null;
}

export async function countActiveAdmins(exec = query) {
  const { rows } = await exec(`SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND is_active = TRUE`);
  return rows[0].total;
}

export async function promoteToAdmin(userId, exec = query) {
  await exec(
    `UPDATE users SET role = 'admin', is_active = TRUE, updated_at = now() WHERE id = $1`,
    [userId],
  );
}
