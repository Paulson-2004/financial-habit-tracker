import { z } from 'zod';
import { amountSchema, dateFormatSchema, monthFormatSchema, uuidSchema } from './common.js';
import { isWithinAllowedDateRange } from '../utils/dates.js';

export const transactionTypeSchema = z.enum(['income', 'expense']);

// Re-exported for any existing importer - amountSchema itself now lives in common.js so
// habit/goal validators can reuse the exact same rule (see AGENTS.md section 12).
export { amountSchema };

// 'YYYY-MM-DD'. See docs/business-rules.md for the future-date rule this enforces.
export const transactionDateSchema = z
  .string()
  .refine(isWithinAllowedDateRange, 'Enter a valid transaction date (not before 2000 or too far in the future)');

export const descriptionSchema = z.string().trim().max(200, 'Description is too long').nullable().optional();

// .strict() rejects unknown keys (e.g. a client trying to send userId).
export const transactionBodySchema = z
  .object({
    type: transactionTypeSchema,
    categoryId: uuidSchema,
    amount: amountSchema,
    transactionDate: transactionDateSchema,
    description: descriptionSchema,
  })
  .strict();

// Query params arrive as strings, so numeric fields are coerced.
export const transactionListQuerySchema = z
  .object({
    type: transactionTypeSchema.optional(),
    categoryId: uuidSchema.optional(),
    month: monthFormatSchema.optional(),
    startDate: dateFormatSchema.optional(),
    endDate: dateFormatSchema.optional(),
    search: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const transactionSummaryQuerySchema = z.object({ month: monthFormatSchema.optional() }).strict();

export const categoryListQuerySchema = z.object({ type: transactionTypeSchema.optional() }).strict();

export const transactionIdParamsSchema = z.object({ id: uuidSchema }).strict();
