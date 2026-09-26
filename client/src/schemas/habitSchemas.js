import { z } from 'zod';

export const HABIT_CATEGORIES = ['saving', 'budgeting', 'investing', 'other'];
export const HABIT_CATEGORY_LABELS = { saving: 'Saving', budgeting: 'Budgeting', investing: 'Investing', other: 'Other' };

export const habitFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  description: z.string().trim().max(255, 'Description is too long'),
  category: z.enum(HABIT_CATEGORIES),
});

export const defaultHabitFormValues = { name: '', description: '', category: 'other' };
