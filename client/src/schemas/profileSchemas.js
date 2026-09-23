import { z } from 'zod';

// See the note in transactionSchemas.js - the server's updateProfileSchema is authoritative
// for the real business rules (non-negative, max value); this just catches obvious typos.
export const profileFormSchema = z.object({
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Use a 3-letter code, e.g. USD'),
  occupation: z.string().trim().max(80, 'Occupation is too long'),
  monthlyBudget: z.string().refine((value) => value.trim() === '' || !Number.isNaN(Number(value)), 'Enter a valid number'),
  monthlySavingsTarget: z
    .string()
    .refine((value) => value.trim() === '' || !Number.isNaN(Number(value)), 'Enter a valid number'),
});
