import { query } from '../pool.js';

// All SQL for the users / financial_profiles tables lives here.
// Every function accepts an optional `exec` (defaults to the pool) so it can run inside withTransaction.
// PUBLIC_COLUMNS is a constant, never user input, so interpolating it is safe.
const PUBLIC_COLUMNS = 'id, name, email, role, is_active, created_at';

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

export async function promoteToAdmin(userId, exec = query) {
  await exec(
    `UPDATE users SET role = 'admin', is_active = TRUE, updated_at = now() WHERE id = $1`,
    [userId],
  );
}
