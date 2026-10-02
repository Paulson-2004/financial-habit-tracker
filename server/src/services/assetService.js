import { AppError } from '../utils/AppError.js';
import * as assetsDb from '../db/queries/assets.js';

function toPublicAsset(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    value: row.value,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAssets(userId) {
  const rows = await assetsDb.listAssets(userId);
  return rows.map(toPublicAsset);
}

export async function getAsset(userId, id) {
  const row = await assetsDb.findAssetById(userId, id);
  // Not found and not-yours are indistinguishable on purpose - see AGENTS.md section 7.
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Asset not found.');
  return toPublicAsset(row);
}

export async function createAsset(userId, body) {
  const row = await assetsDb.insertAsset(userId, body);
  return toPublicAsset(row);
}

export async function updateAsset(userId, id, updates) {
  const row = await assetsDb.updateAssetById(userId, id, updates);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Asset not found.');
  return toPublicAsset(row);
}

export async function deleteAsset(userId, id) {
  const deleted = await assetsDb.deleteAssetById(userId, id);
  if (!deleted) throw new AppError(404, 'NOT_FOUND', 'Asset not found.');
}
