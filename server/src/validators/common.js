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
