import { AppError } from '../utils/AppError.js';
import * as profilesDb from '../db/queries/profiles.js';

function toPublicProfile(profile) {
  return {
    currency: profile.currency,
    occupation: profile.occupation,
    monthlyBudget: profile.monthlyBudget,
    monthlySavingsTarget: profile.monthlySavingsTarget,
    updatedAt: profile.updatedAt,
  };
}

export async function getProfile(userId) {
  const profile = await profilesDb.findProfileByUserId(userId);
  // Every user gets a financial_profiles row at registration (see db/queries/users.js),
  // so a missing row means something is wrong, not that the user simply has none yet.
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Financial profile not found.');
  return toPublicProfile(profile);
}

export async function updateProfile(userId, updates) {
  const profile = await profilesDb.updateProfile(userId, updates);
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Financial profile not found.');
  return toPublicProfile(profile);
}
