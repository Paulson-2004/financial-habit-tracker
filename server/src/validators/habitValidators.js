import { z } from 'zod';
import { dateFormatSchema, uuidSchema } from './common.js';
import { isWithinAllowedDateRange } from '../utils/dates.js';

export const habitCategorySchema = z.enum(['saving', 'budgeting', 'investing', 'other']);

// .strict() rejects unknown keys - in particular, isActive and frequency are not
// client-settable for Day 3 (frequency only ever has one value; isActive has no Day 3
// UI - see docs/database.md).
export const habitBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    description: z.string().trim().max(255, 'Description is too long').nullable().optional(),
    category: habitCategorySchema.optional(),
  })
  .strict();

// 'YYYY-MM-DD', client-supplied so streaks are computed relative to the user's own
// calendar day rather than the server's - see docs/business-rules.md.
export const habitTodayQuerySchema = z.object({ today: dateFormatSchema.optional() }).strict();

export const habitIdParamsSchema = z.object({ id: uuidSchema }).strict();

export const habitCompletionDateParamsSchema = z
  .object({ id: uuidSchema, date: dateFormatSchema })
  .strict();

export const markCompletionBodySchema = z
  .object({
    date: z.string().refine(isWithinAllowedDateRange, 'Enter a valid date (not before 2000 or too far in the future)'),
  })
  .strict();
