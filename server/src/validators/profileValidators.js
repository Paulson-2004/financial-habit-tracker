import { z } from 'zod';

// ISO 4217-shaped, not validated against the real currency list - good enough for a
// tracking app (see docs/business-rules.md); rejects obvious junk like "US$" or "usd1".
export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter code, e.g. USD');

const moneyLimitSchema = z
  .number()
  .finite()
  .nonnegative('Must be zero or greater')
  .max(1_000_000_000, 'Value is too large')
  .nullable();

// Every field is optional (PATCH semantics) but null explicitly clears it; omitting a
// key leaves it unchanged. At least one key must be present, enforced by .refine below.
export const updateProfileSchema = z
  .object({
    currency: currencySchema.optional(),
    occupation: z.string().trim().max(80, 'Occupation is too long').nullable().optional(),
    monthlyBudget: moneyLimitSchema.optional(),
    monthlySavingsTarget: moneyLimitSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
