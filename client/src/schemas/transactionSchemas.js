import { z } from 'zod';

// Loose, form-friendly validation for instant feedback - the server's transactionBodySchema
// (server/src/validators/transactionValidators.js) is the authoritative check (2 decimal
// places, the future-date rule, category/type match, etc); see AGENTS.md section 12.
export const transactionFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  categoryId: z.string().min(1, 'Choose a category'),
  amount: z.string().refine((value) => value.trim() !== '' && Number(value) > 0, 'Enter an amount greater than 0'),
  transactionDate: z.string().min(1, 'Choose a date'),
  description: z.string().trim().max(200, 'Description is too long'),
});

export const defaultTransactionFormValues = {
  type: 'expense',
  categoryId: '',
  amount: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  description: '',
};
