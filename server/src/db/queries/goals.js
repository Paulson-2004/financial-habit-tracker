import { query } from '../pool.js';

// Ownership pattern: every query below filters by user_id directly, in addition to
// goal_id/id (AGENTS.md section 5 and 7) - goal_contributions carries its own user_id
// column specifically so these WHERE clauses never need to rely on a join alone.

const GOAL_COLUMNS = 'id, user_id, name, description, target_amount, target_date, created_at, updated_at';
const CONTRIBUTION_COLUMNS = 'id, goal_id, user_id, amount, contribution_date, note, created_at';

export async function listGoals(userId, exec = query) {
  const { rows } = await exec(`SELECT ${GOAL_COLUMNS} FROM savings_goals WHERE user_id = $1 ORDER BY created_at`, [
    userId,
  ]);
  return rows;
}

export async function findGoalById(userId, id, exec = query) {
  const { rows } = await exec(`SELECT ${GOAL_COLUMNS} FROM savings_goals WHERE id = $1 AND user_id = $2`, [
    id,
    userId,
  ]);
  return rows[0] ?? null;
}

export async function insertGoal(userId, { name, description, targetAmount, targetDate }, exec = query) {
  const { rows } = await exec(
    `INSERT INTO savings_goals (user_id, name, description, target_amount, target_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, name, description ?? null, targetAmount, targetDate ?? null],
  );
  return rows[0].id;
}

/** Returns the updated row's id, or null if it doesn't exist or belongs to another user. */
export async function updateGoalById(userId, id, { name, description, targetAmount, targetDate }, exec = query) {
  const { rows } = await exec(
    `UPDATE savings_goals
     SET name = $1, description = $2, target_amount = $3, target_date = $4, updated_at = now()
     WHERE id = $5 AND user_id = $6
     RETURNING id`,
    [name, description ?? null, targetAmount, targetDate ?? null, id, userId],
  );
  return rows[0]?.id ?? null;
}

/** Returns true if a row belonging to this user was deleted (cascades its contributions). */
export async function deleteGoalById(userId, id, exec = query) {
  const { rowCount } = await exec('DELETE FROM savings_goals WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

/** Total contributed toward one goal so far. 0 (never null) when there are none yet. */
export async function getContributedAmount(userId, goalId, exec = query) {
  const { rows } = await exec(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM goal_contributions WHERE goal_id = $1 AND user_id = $2',
    [goalId, userId],
  );
  return rows[0].total;
}

export async function listContributions(userId, goalId, exec = query) {
  const { rows } = await exec(
    `SELECT ${CONTRIBUTION_COLUMNS} FROM goal_contributions
     WHERE goal_id = $1 AND user_id = $2
     ORDER BY contribution_date DESC, created_at DESC`,
    [goalId, userId],
  );
  return rows;
}

export async function insertContribution(userId, goalId, { amount, contributionDate, note }, exec = query) {
  const { rows } = await exec(
    `INSERT INTO goal_contributions (goal_id, user_id, amount, contribution_date, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${CONTRIBUTION_COLUMNS}`,
    [goalId, userId, amount, contributionDate, note ?? null],
  );
  return rows[0];
}

/** Returns true if a contribution belonging to this user's goal was deleted. */
export async function deleteContributionById(userId, goalId, contributionId, exec = query) {
  const { rowCount } = await exec(
    'DELETE FROM goal_contributions WHERE id = $1 AND goal_id = $2 AND user_id = $3',
    [contributionId, goalId, userId],
  );
  return rowCount > 0;
}
