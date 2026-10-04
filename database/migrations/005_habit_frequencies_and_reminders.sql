-- 005_habit_frequencies_and_reminders.sql
-- Extend habits to support weekly and monthly frequencies alongside daily.
-- Add in-app habit reminder configuration (reminder_enabled, reminder_time).

-- 1. Frequency: drop the single-value CHECK constraint and allow daily, weekly, monthly.
ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_frequency_check;
ALTER TABLE habits ADD CONSTRAINT habits_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'monthly'));

-- 2. Reminders: add optional in-app reminder settings.
-- reminder_enabled indicates whether the user wants reminders for this habit.
-- reminder_time stores the optional target time of day (e.g. '09:00' or '20:00').
ALTER TABLE habits ADD COLUMN reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE habits ADD COLUMN reminder_time TIME;
