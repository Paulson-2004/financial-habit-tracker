import { AppError } from '../utils/AppError.js';
import * as adminDb from '../db/queries/admin.js';
import * as feedbackDb from '../db/queries/feedback.js';
import * as usersDb from '../db/queries/users.js';

// The only user shape an admin response may carry. Never password_hash, tokens,
// financial rows, or anything beyond safe account metadata.
function toSafeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt ?? null,
    createdAt: row.createdAt,
  };
}

function toAdminFeedback(row) {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    message: row.message,
    status: row.status,
    adminNote: row.adminNote ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: { id: row.userId, name: row.authorName, email: row.authorEmail },
  };
}

function withPagination(page, pageSize, total) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getOverview() {
  const [counts, monthly, recentUsers, recentFeedback] = await Promise.all([
    adminDb.getPlatformCounts(),
    adminDb.getMonthlyTrends(),
    adminDb.getRecentUsers(5),
    adminDb.getRecentFeedback(5),
  ]);

  return {
    users: {
      total: counts.totalUsers,
      active: counts.activeUsers,
      activeAdmins: counts.activeAdmins,
      newLast7Days: counts.newUsers7d,
      newLast30Days: counts.newUsers30d,
    },
    content: {
      transactions: counts.transactions,
      habits: counts.habits,
      habitCompletions: counts.habitCompletions,
      savingsGoals: counts.savingsGoals,
      goalContributions: counts.goalContributions,
      assets: counts.assets,
      liabilities: counts.liabilities,
    },
    feedback: {
      total: counts.feedbackTotal,
      open: counts.feedbackOpen,
      inReview: counts.feedbackInReview,
      resolved: counts.feedbackResolved,
      complaints: counts.complaints,
    },
    monthlyTrends: monthly.map((row) => ({
      month: row.month,
      newUsers: row.newUsers,
      transactions: row.transactions,
      feedback: row.feedback,
    })),
    recentUsers: recentUsers.map(toSafeUser),
    recentFeedback: recentFeedback.map((row) => ({
      id: row.id,
      type: row.type,
      subject: row.subject,
      status: row.status,
      createdAt: row.createdAt,
      author: { name: row.authorName, email: row.authorEmail },
    })),
  };
}

export async function listUsers({ page, pageSize, search, role, isActive }) {
  const { rows, total } = await usersDb.listUsers({ page, pageSize, search, role, isActive });
  return { rows: rows.map(toSafeUser), meta: withPagination(page, pageSize, total) };
}

export async function getUserById(id) {
  const row = await usersDb.findUserById(id);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'User not found.');
  return toSafeUser(row);
}

export async function setUserActive(adminId, id, isActive) {
  const row = await usersDb.findUserById(id);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'User not found.');

  if (id === adminId && !isActive) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot deactivate your own account.');
  }
  if (row.role === 'admin' && !isActive) {
    const activeAdmins = await usersDb.countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new AppError(409, 'CONFLICT', 'Cannot deactivate the last active admin.');
    }
  }

  const updated = await usersDb.updateUserActive(id, isActive);
  return toSafeUser(updated);
}

export async function listAllFeedback({ page, pageSize, status, type, search }) {
  const { rows, total } = await feedbackDb.listAllFeedback({ page, pageSize, status, type, search });
  return { rows: rows.map(toAdminFeedback), meta: withPagination(page, pageSize, total) };
}

export async function getAnyFeedback(id) {
  const row = await feedbackDb.findAnyFeedbackById(id);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Feedback not found.');
  return toAdminFeedback(row);
}

export async function updateFeedback(id, { status, adminNote }) {
  const existing = await feedbackDb.findAnyFeedbackById(id);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Feedback not found.');
  const row = await feedbackDb.updateFeedbackByAdmin(id, { status, adminNote });
  const author = { id: existing.userId, name: existing.authorName, email: existing.authorEmail };
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    message: row.message,
    status: row.status,
    adminNote: row.adminNote ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author,
  };
}
