import { AppError } from '../utils/AppError.js';
import * as goalsDb from '../db/queries/goals.js';
import { computeGoalProgress, computeGoalStatus } from '../calc/goals.js';
import { todayUTC } from '../utils/dates.js';

function toPublicGoal(row, contributedAmount, today) {
  const { remainingAmount, progressPercent, overfundedBy } = computeGoalProgress(row.targetAmount, contributedAmount);
  const status = computeGoalStatus({
    contributedAmount,
    targetAmount: row.targetAmount,
    targetDate: row.targetDate,
    today,
  });

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetAmount: row.targetAmount,
    targetDate: row.targetDate,
    contributedAmount,
    remainingAmount,
    progressPercent,
    overfundedBy,
    status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function enrichGoal(userId, row, today) {
  const contributedAmount = await goalsDb.getContributedAmount(userId, row.id);
  return toPublicGoal(row, contributedAmount, today);
}

export async function listGoals(userId, today = todayUTC()) {
  const rows = await goalsDb.listGoals(userId);
  return Promise.all(rows.map((row) => enrichGoal(userId, row, today)));
}

export async function getGoal(userId, id, today = todayUTC()) {
  const row = await goalsDb.findGoalById(userId, id);
  // Not found and not-yours are indistinguishable on purpose - see AGENTS.md section 7.
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Goal not found.');
  return enrichGoal(userId, row, today);
}

export async function createGoal(userId, body) {
  const id = await goalsDb.insertGoal(userId, body);
  return getGoal(userId, id);
}

export async function updateGoal(userId, id, body) {
  const updatedId = await goalsDb.updateGoalById(userId, id, body);
  if (!updatedId) throw new AppError(404, 'NOT_FOUND', 'Goal not found.');
  return getGoal(userId, updatedId);
}

export async function deleteGoal(userId, id) {
  const deleted = await goalsDb.deleteGoalById(userId, id);
  if (!deleted) throw new AppError(404, 'NOT_FOUND', 'Goal not found.');
}

// Every contribution function below calls this FIRST, so a contribution is never read or
// written using a goalId that doesn't already belong to the requesting user (in addition
// to goal_contributions' own user_id column - see database/migrations/003_*.sql).
async function assertGoalOwnership(userId, goalId) {
  const goal = await goalsDb.findGoalById(userId, goalId);
  if (!goal) throw new AppError(404, 'NOT_FOUND', 'Goal not found.');
}

export async function listContributions(userId, goalId) {
  await assertGoalOwnership(userId, goalId);
  return goalsDb.listContributions(userId, goalId);
}

export async function addContribution(userId, goalId, body, today = todayUTC()) {
  await assertGoalOwnership(userId, goalId);
  const contribution = await goalsDb.insertContribution(userId, goalId, body);
  const goal = await getGoal(userId, goalId, today);
  return { contribution, goal };
}

export async function deleteContribution(userId, goalId, contributionId, today = todayUTC()) {
  await assertGoalOwnership(userId, goalId);
  const removed = await goalsDb.deleteContributionById(userId, goalId, contributionId);
  if (!removed) throw new AppError(404, 'NOT_FOUND', 'Contribution not found.');
  return getGoal(userId, goalId, today);
}
