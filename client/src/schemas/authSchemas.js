import { z } from 'zod';

// Mirrors server/src/validators/authValidators.js so the form gives instant feedback.
// The server re-validates everything; this schema is a UX convenience, not the source of truth.
export const registerFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
});

export const loginFormSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
