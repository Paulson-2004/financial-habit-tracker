import { z } from 'zod';
import { amountSchema, uuidSchema } from './common.js';

export const liabilityCategorySchema = z.enum([
  'credit_card', 'personal_loan', 'education_loan', 'vehicle_loan', 'home_loan', 'other',
]);

const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');
const descriptionSchema = z.string().trim().max(255, 'Description is too long').nullable().optional();

// .strict() rejects unknown keys (e.g. a client-supplied userId).
export const createLiabilitySchema = z
  .object({
    name: nameSchema,
    category: liabilityCategorySchema.optional(),
    amount: amountSchema,
    description: descriptionSchema,
  })
  .strict();

// PATCH semantics (unlike transactions/habits/goals' PUT full-replace): every field is
// optional, at least one required - matches the profile update pattern.
export const updateLiabilitySchema = z
  .object({
    name: nameSchema.optional(),
    category: liabilityCategorySchema.optional(),
    amount: amountSchema.optional(),
    description: descriptionSchema,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const liabilityIdParamsSchema = z.object({ id: uuidSchema }).strict();
