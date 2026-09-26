import { z } from 'zod';

export const goalFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  description: z.string().trim().max(255, 'Description is too long'),
  targetAmount: z.string().refine((value) => value.trim() !== '' && Number(value) > 0, 'Enter an amount greater than 0'),
  targetDate: z.string(), // optional - empty string means no deadline
});

export const defaultGoalFormValues = { name: '', description: '', targetAmount: '', targetDate: '' };

export const contributionFormSchema = z.object({
  amount: z.string().refine((value) => value.trim() !== '' && Number(value) > 0, 'Enter an amount greater than 0'),
  contributionDate: z.string().min(1, 'Choose a date'),
  note: z.string().trim().max(200, 'Note is too long'),
});

export const defaultContributionFormValues = {
  amount: '',
  contributionDate: new Date().toISOString().slice(0, 10),
  note: '',
};
