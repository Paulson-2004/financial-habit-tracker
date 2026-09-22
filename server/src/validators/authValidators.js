import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';

// .strict() rejects unknown keys, which blocks mass-assignment (e.g. sending role: 'admin').
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

// Login does not re-check password strength: it only needs a bounded, non-empty string.
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
  })
  .strict();
