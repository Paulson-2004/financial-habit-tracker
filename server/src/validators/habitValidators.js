import { z } from 'zod';
import { dateFormatSchema, uuidSchema } from './common.js';
import { isWithinAllowedDateRange } from '../utils/dates.js';

export const habitCategorySchema = z.enum(['saving', 'budgeting', 'investing', 'other']);
export const habitFrequencySchema = z.enum(['daily', 'weekly', 'monthly']);

export const habitReminderTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time in HH:MM format (e.g. 09:00 or 20:30)');

export const habitBodySchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
    description: z.string().trim().max(255, 'Description is too long').nullable().optional(),
    category: habitCategorySchema.optional(),
    frequency: habitFrequencySchema.optional(),
    reminderEnabled: z.boolean().optional(),
    reminderTime: habitReminderTimeSchema.nullable().optional(),
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
