import { z } from 'zod';
import { amountSchema, uuidSchema } from './common.js';

export const assetCategorySchema = z.enum([
  'cash', 'bank_account', 'fixed_deposit', 'stocks', 'mutual_funds', 'gold', 'property', 'vehicle', 'other',
]);

const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');
const descriptionSchema = z.string().trim().max(255, 'Description is too long').nullable().optional();

// .strict() rejects unknown keys (e.g. a client-supplied userId).
export const createAssetSchema = z
  .object({
    name: nameSchema,
    category: assetCategorySchema.optional(),
    value: amountSchema,
    description: descriptionSchema,
  })
  .strict();

// PATCH semantics (unlike transactions/habits/goals' PUT full-replace): every field is
// optional, at least one required - matches the profile update pattern.
export const updateAssetSchema = z
  .object({
    name: nameSchema.optional(),
    category: assetCategorySchema.optional(),
    value: amountSchema.optional(),
    description: descriptionSchema,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const assetIdParamsSchema = z.object({ id: uuidSchema }).strict();
