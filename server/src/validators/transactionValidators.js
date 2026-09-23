import { z } from 'zod';
import { uuidSchema } from './common.js';
import { isWithinTransactionDateRange } from '../utils/dates.js';

export const transactionTypeSchema = z.enum(['income', 'expense']);

// Matches the NUMERIC(14,2) column: positive, at most 2 decimal places, bounded so a
// typo (an extra zero or two) can't silently create an absurd transaction.
export const amountSchema = z
  .number()
  .finite('Amount must be a number')
  .positive('Amount must be greater than 0')
  .max(1_000_000_000, 'Amount is too large')
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9,
    'Amount can have at most 2 decimal places',
  );

// 'YYYY-MM-DD'. See docs/business-rules.md for the future-date rule this enforces.
export const transactionDateSchema = z
  .string()
  .refine(isWithinTransactionDateRange, 'Enter a valid transaction date (not before 2000 or too far in the future)');

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

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format');
const isoDateFormatSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

// Query params arrive as strings, so numeric fields are coerced.
export const transactionListQuerySchema = z
  .object({
    type: transactionTypeSchema.optional(),
    categoryId: uuidSchema.optional(),
    month: monthSchema.optional(),
    startDate: isoDateFormatSchema.optional(),
    endDate: isoDateFormatSchema.optional(),
    search: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const transactionSummaryQuerySchema = z.object({ month: monthSchema.optional() }).strict();

export const categoryListQuerySchema = z.object({ type: transactionTypeSchema.optional() }).strict();

export const transactionIdParamsSchema = z.object({ id: uuidSchema }).strict();
