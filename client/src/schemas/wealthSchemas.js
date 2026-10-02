import { z } from 'zod';

// Category values mirror server/src/validators/assetValidators.js and
// liabilityValidators.js (and the CHECK constraints in migration 004).
export const ASSET_CATEGORIES = [
  'cash', 'bank_account', 'fixed_deposit', 'stocks', 'mutual_funds', 'gold', 'property', 'vehicle', 'other',
];
export const ASSET_CATEGORY_LABELS = {
  cash: 'Cash',
  bank_account: 'Bank account',
  fixed_deposit: 'Fixed deposit',
  stocks: 'Stocks',
  mutual_funds: 'Mutual funds',
  gold: 'Gold',
  property: 'Property',
  vehicle: 'Vehicle',
  other: 'Other',
};

export const LIABILITY_CATEGORIES = ['credit_card', 'personal_loan', 'education_loan', 'vehicle_loan', 'home_loan', 'other'];
export const LIABILITY_CATEGORY_LABELS = {
  credit_card: 'Credit card',
  personal_loan: 'Personal loan',
  education_loan: 'Education loan',
  vehicle_loan: 'Vehicle loan',
  home_loan: 'Home loan',
  other: 'Other',
};

// Loose, form-friendly validation for instant feedback - the server's schemas are
// authoritative (positive, at most 2 decimals, bounded) - see AGENTS.md section 12.
const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');
const descriptionSchema = z.string().trim().max(255, 'Description is too long');
const positiveAmountSchema = z
  .string()
  .refine((value) => value.trim() !== '' && Number(value) > 0, 'Enter an amount greater than 0');

function categorySchema(allowed) {
  return z.string().refine((value) => allowed.includes(value), 'Choose a category');
}

export const assetFormSchema = z.object({
  name: nameSchema,
  category: categorySchema(ASSET_CATEGORIES),
  value: positiveAmountSchema,
  description: descriptionSchema,
});

export const liabilityFormSchema = z.object({
  name: nameSchema,
  category: categorySchema(LIABILITY_CATEGORIES),
  amount: positiveAmountSchema,
  description: descriptionSchema,
});

export const defaultAssetFormValues = { name: '', category: '', value: '', description: '' };
export const defaultLiabilityFormValues = { name: '', category: '', amount: '', description: '' };
