import { z } from 'zod';

export const HABIT_CATEGORIES = ['saving', 'budgeting', 'investing', 'other'];
export const HABIT_CATEGORY_LABELS = { saving: 'Saving', budgeting: 'Budgeting', investing: 'Investing', other: 'Other' };

export const HABIT_FREQUENCIES = ['daily', 'weekly', 'monthly'];
export const HABIT_FREQUENCY_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

export const HABIT_PERIOD_LABELS = {
  daily: 'Today',
  weekly: 'This week',
  monthly: 'This month',
};

export const habitFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  description: z.string().trim().max(255, 'Description is too long'),
  category: z.enum(HABIT_CATEGORIES),
  frequency: z.enum(HABIT_FREQUENCIES),
  reminderEnabled: z.boolean(),
  reminderTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time in HH:MM format (e.g. 09:00 or 20:30)')
    .or(z.literal('')),
});

export const defaultHabitFormValues = {
  name: '',
  description: '',
  category: 'other',
  frequency: 'daily',
  reminderEnabled: false,
  reminderTime: '20:00',
};
