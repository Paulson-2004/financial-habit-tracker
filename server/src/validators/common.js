import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254, 'Email is too long');

// bcrypt only uses the first 72 bytes, so longer passwords are rejected instead of silently truncated.
// NOTE: keep in sync with client/src/schemas/authSchemas.js.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password must be at most 72 bytes')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

export const uuidSchema = z.string().uuid();

// A positive money amount, shared by every monetary field in the app (transaction
// amount, goal target/contribution amount - see AGENTS.md section 12 on not duplicating
// validation). At most 2 decimal places (matches every NUMERIC(14,2) column), bounded so
// a typo (an extra zero or two) can't silently create an absurd value.
export const amountSchema = z
  .number()
  .finite('Amount must be a number')
  .positive('Amount must be greater than 0')
  .max(1_000_000_000, 'Amount is too large')
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9,
    'Amount can have at most 2 decimal places',
  );

export const dateFormatSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
export const monthFormatSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format');
