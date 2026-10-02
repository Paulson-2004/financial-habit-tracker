import { AppError } from '../utils/AppError.js';
import * as liabilitiesDb from '../db/queries/liabilities.js';

function toPublicLiability(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: row.amount,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listLiabilities(userId) {
  const rows = await liabilitiesDb.listLiabilities(userId);
  return rows.map(toPublicLiability);
}

export async function getLiability(userId, id) {
  const row = await liabilitiesDb.findLiabilityById(userId, id);
  // Not found and not-yours are indistinguishable on purpose - see AGENTS.md section 7.
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Liability not found.');
  return toPublicLiability(row);
}

export async function createLiability(userId, body) {
  const row = await liabilitiesDb.insertLiability(userId, body);
  return toPublicLiability(row);
}

export async function updateLiability(userId, id, updates) {
  const row = await liabilitiesDb.updateLiabilityById(userId, id, updates);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Liability not found.');
  return toPublicLiability(row);
}

export async function deleteLiability(userId, id) {
  const deleted = await liabilitiesDb.deleteLiabilityById(userId, id);
  if (!deleted) throw new AppError(404, 'NOT_FOUND', 'Liability not found.');
}
