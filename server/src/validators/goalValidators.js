import { z } from 'zod';
import { amountSchema, uuidSchema } from './common.js';
import { isValidCalendarDateString, isWithinAllowedDateRange, todayUTC } from '../utils/dates.js';

const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');
const descriptionSchema = z.string().trim().max(255, 'Description is too long').nullable().optional();

// targetDate is a written record (like transactionDate), not a query filter, so it gets
// the same full calendar-date check as transactions/completions/contributions - not just
// a format check. See docs/business-rules.md.
const calendarDateSchema = z.string().refine(isValidCalendarDateString, 'Enter a valid date');

// On create, a target date in the past makes no sense - reject it. On update it is NOT
// re-checked against "today" (createGoalSchema vs updateGoalSchema differ only here): an
// existing goal's deadline naturally moves into the past over time, and that is exactly
// what the 'overdue' status means (calc/goals.js), not an error that should block editing
// unrelated fields.
const futureTargetDateSchema = calendarDateSchema
  .refine((value) => value >= todayUTC(), 'Target date must be today or later')
  .nullable()
  .optional();

const anyTargetDateSchema = calendarDateSchema.nullable().optional();

// .strict() rejects unknown keys (e.g. a client-supplied status or contributedAmount).
export const createGoalSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    targetAmount: amountSchema,
    targetDate: futureTargetDateSchema,
  })
  .strict();

export const updateGoalSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    targetAmount: amountSchema,
    targetDate: anyTargetDateSchema,
  })
  .strict();

export const goalIdParamsSchema = z.object({ id: uuidSchema }).strict();

export const contributionIdParamsSchema = z.object({ id: uuidSchema, contributionId: uuidSchema }).strict();

export const createContributionSchema = z
  .object({
    amount: amountSchema,
    contributionDate: z
      .string()
      .refine(isWithinAllowedDateRange, 'Enter a valid date (not before 2000 or too far in the future)'),
    note: z.string().trim().max(200, 'Note is too long').optional(),
  })
  .strict();
