import { query } from '../pool.js';

// Ownership pattern: every habit query filters by user_id directly (AGENTS.md section 5).
// habit_completions has no user_id column of its own - its owner is reached through
// habit_id -> habits.user_id, so every completion function below is only ever called
// AFTER the service layer has confirmed the habit belongs to the requesting user (see
// services/habitService.js) - completions are never queried by id alone.

const HABIT_COLUMNS = 'id, user_id, name, description, category, frequency, is_active, created_at, updated_at';

export async function listHabits(userId, exec = query) {
  const { rows } = await exec(
    `SELECT ${HABIT_COLUMNS} FROM habits WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at`,
    [userId],
  );
  return rows;
}

export async function findHabitById(userId, id, exec = query) {
  const { rows } = await exec(`SELECT ${HABIT_COLUMNS} FROM habits WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0] ?? null;
}

export async function insertHabit(userId, { name, description, category }, exec = query) {
  const { rows } = await exec(
    `INSERT INTO habits (user_id, name, description, category)
     VALUES ($1, $2, $3, COALESCE($4, 'other'))
     RETURNING id`,
    [userId, name, description ?? null, category ?? null],
  );
  return rows[0].id;
}

/** Returns the updated row's id, or null if it doesn't exist or belongs to another user. */
export async function updateHabitById(userId, id, { name, description, category }, exec = query) {
  const { rows } = await exec(
    `UPDATE habits
     SET name = $1, description = $2, category = COALESCE($3, 'other'), updated_at = now()
     WHERE id = $4 AND user_id = $5
     RETURNING id`,
    [name, description ?? null, category ?? null, id, userId],
  );
  return rows[0]?.id ?? null;
}

/** Returns true if a row belonging to this user was deleted. */
export async function deleteHabitById(userId, id, exec = query) {
  const { rowCount } = await exec('DELETE FROM habits WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

/** All completion dates for one habit, as 'YYYY-MM-DD' strings, in no particular order. */
export async function findCompletionDates(habitId, exec = query) {
  const { rows } = await exec('SELECT completion_date FROM habit_completions WHERE habit_id = $1', [habitId]);
  return rows.map((row) => row.completionDate);
}

/** Idempotent: marking an already-completed date complete again is a no-op, not an error. */
export async function insertCompletion(habitId, date, exec = query) {
  await exec(
    'INSERT INTO habit_completions (habit_id, completion_date) VALUES ($1, $2) ON CONFLICT (habit_id, completion_date) DO NOTHING',
    [habitId, date],
  );
}

/** Returns true if a completion for that date existed and was removed. */
export async function deleteCompletion(habitId, date, exec = query) {
  const { rowCount } = await exec('DELETE FROM habit_completions WHERE habit_id = $1 AND completion_date = $2', [
    habitId,
    date,
  ]);
  return rowCount > 0;
}
