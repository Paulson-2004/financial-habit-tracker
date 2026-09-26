import { AppError } from '../utils/AppError.js';
import * as habitsDb from '../db/queries/habits.js';
import { computeCurrentStreak, computeLongestStreak, isCompletedToday } from '../calc/streaks.js';
import { todayUTC } from '../utils/dates.js';

// Mirrors the transaction/habit caps already established in the architecture plan -
// a sanity limit, not a real business constraint.
const MAX_HABITS_PER_USER = 20;

function toPublicHabit(row, completionDates, today) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    frequency: row.frequency,
    isActive: row.isActive,
    completedToday: isCompletedToday(completionDates, today),
    currentStreak: computeCurrentStreak(completionDates, today),
    longestStreak: computeLongestStreak(completionDates),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// `today` is always the caller's real "current date" (query param, defaulting to the
// server's UTC today - see habitTodayQuerySchema) - NEVER the date of a completion just
// marked/unmarked, which may be backdated. Conflating the two would make a backfilled
// past completion look like it changed what day "today" is.
async function enrichHabit(row, today) {
  const completionDates = await habitsDb.findCompletionDates(row.id);
  return toPublicHabit(row, completionDates, today);
}

export async function listHabits(userId, today = todayUTC()) {
  const rows = await habitsDb.listHabits(userId);
  return Promise.all(rows.map((row) => enrichHabit(row, today)));
}

export async function getHabit(userId, id, today = todayUTC()) {
  const row = await habitsDb.findHabitById(userId, id);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Habit not found.');
  return enrichHabit(row, today);
}

export async function createHabit(userId, body) {
  const existing = await habitsDb.listHabits(userId);
  if (existing.length >= MAX_HABITS_PER_USER) {
    throw new AppError(409, 'LIMIT_REACHED', `You can track up to ${MAX_HABITS_PER_USER} habits.`);
  }
  const id = await habitsDb.insertHabit(userId, body);
  return getHabit(userId, id);
}

export async function updateHabit(userId, id, body) {
  const updatedId = await habitsDb.updateHabitById(userId, id, body);
  if (!updatedId) throw new AppError(404, 'NOT_FOUND', 'Habit not found.');
  return getHabit(userId, updatedId);
}

export async function deleteHabit(userId, id) {
  const deleted = await habitsDb.deleteHabitById(userId, id);
  if (!deleted) throw new AppError(404, 'NOT_FOUND', 'Habit not found.');
}

// Not found and not-yours are indistinguishable on purpose - see AGENTS.md section 7.
// Every completion function below calls this FIRST, so a completion is never read or
// written using a habitId that doesn't already belong to the requesting user.
async function assertHabitOwnership(userId, habitId) {
  const habit = await habitsDb.findHabitById(userId, habitId);
  if (!habit) throw new AppError(404, 'NOT_FOUND', 'Habit not found.');
}

/** Idempotent - completing an already-completed date is a no-op, not an error. */
export async function markCompletion(userId, habitId, date, today = todayUTC()) {
  await assertHabitOwnership(userId, habitId);
  await habitsDb.insertCompletion(habitId, date);
  return getHabit(userId, habitId, today);
}

export async function undoCompletion(userId, habitId, date, today = todayUTC()) {
  await assertHabitOwnership(userId, habitId);
  const removed = await habitsDb.deleteCompletion(habitId, date);
  if (!removed) throw new AppError(404, 'NOT_FOUND', 'No completion exists for that date.');
  return getHabit(userId, habitId, today);
}

export async function getCompletionHistory(userId, habitId) {
  await assertHabitOwnership(userId, habitId);
  const dates = await habitsDb.findCompletionDates(habitId);
  return dates.sort();
}
