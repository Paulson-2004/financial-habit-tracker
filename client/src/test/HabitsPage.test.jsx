import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import HabitsPage from '../pages/HabitsPage.jsx';
import HabitForm from '../components/habits/HabitForm.jsx';
import { defaultHabitFormValues } from '../schemas/habitSchemas.js';

let mockHabits = [];

vi.mock('../hooks/useHabits.js', () => ({
  useHabits: () => ({
    data: mockHabits,
    isLoading: false,
    isError: false,
  }),
  useCreateHabit: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateHabit: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteHabit: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMarkCompletion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUndoCompletion: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('HabitsPage & HabitForm - Frequencies and Reminders', () => {
  it('renders frequency options and toggles reminder time input in HabitForm', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<HabitForm defaultValues={defaultHabitFormValues} onSubmit={onSubmit} onCancel={onCancel} isSubmitting={false} />);

    expect(screen.getByLabelText('Habit name')).toBeInTheDocument();
    expect(screen.getByLabelText('Frequency')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Daily' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Weekly' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Monthly' })).toBeInTheDocument();

    const reminderCheckbox = screen.getByLabelText('In-app reminder');
    expect(reminderCheckbox).not.toBeChecked();
    expect(screen.queryByLabelText('Reminder time')).not.toBeInTheDocument();

    // Toggle reminder checkbox on
    fireEvent.click(reminderCheckbox);
    expect(reminderCheckbox).toBeChecked();
    expect(screen.getByLabelText('Reminder time')).toBeInTheDocument();
  });

  it('renders habits with frequency badges and pending reminders alert', () => {
    mockHabits = [
      {
        id: 'h1',
        name: 'Daily Savings',
        category: 'saving',
        frequency: 'daily',
        reminderEnabled: true,
        reminderTime: '21:00',
        isActive: true,
        completedToday: false,
        currentStreak: 2,
        longestStreak: 5,
      },
      {
        id: 'h2',
        name: 'Weekly Budget Review',
        category: 'budgeting',
        frequency: 'weekly',
        reminderEnabled: true,
        reminderTime: '18:00',
        isActive: true,
        completedToday: false,
        currentStreak: 1,
        longestStreak: 3,
      },
      {
        id: 'h3',
        name: 'Monthly Net Worth Audit',
        category: 'investing',
        frequency: 'monthly',
        reminderEnabled: false,
        reminderTime: null,
        isActive: true,
        completedToday: true,
        currentStreak: 4,
        longestStreak: 4,
      },
    ];

    render(<HabitsPage />);

    // Check heading
    expect(screen.getByText('Habit Tracker')).toBeInTheDocument();

    // Check habit cards & frequency badges
    expect(screen.getByText('Daily Savings')).toBeInTheDocument();
    expect(screen.getByText('Weekly Budget Review')).toBeInTheDocument();
    expect(screen.getByText('Monthly Net Worth Audit')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();

    // Check period labels under completion checkmarks
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();

    // Check pending reminder alert box
    expect(screen.getByRole('region', { name: 'Pending habit reminders' })).toBeInTheDocument();
    expect(
      screen.getByText('Remember to complete your daily habit "Daily Savings" today.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your weekly habit "Weekly Budget Review" is pending this week.'),
    ).toBeInTheDocument();

    // h3 is completed, so it should not appear in reminders
    expect(screen.queryByText(/Monthly Net Worth Audit.*due this month/)).not.toBeInTheDocument();
  });

  it('does not display the reminder alert when all reminder habits are completed', () => {
    mockHabits = [
      {
        id: 'h1',
        name: 'Daily Savings',
        category: 'saving',
        frequency: 'daily',
        reminderEnabled: true,
        reminderTime: '21:00',
        isActive: true,
        completedToday: true,
        currentStreak: 3,
        longestStreak: 5,
      },
    ];

    render(<HabitsPage />);
    expect(screen.queryByRole('region', { name: 'Pending habit reminders' })).not.toBeInTheDocument();
  });

  it('does not display reminders for inactive habits', () => {
    mockHabits = [
      {
        id: 'h4',
        name: 'Archived Savings Habit',
        category: 'saving',
        frequency: 'daily',
        reminderEnabled: true,
        reminderTime: '10:00',
        isActive: false,
        completedToday: false,
        currentStreak: 0,
        longestStreak: 0,
      },
    ];

    render(<HabitsPage />);
    expect(screen.queryByRole('region', { name: 'Pending habit reminders' })).not.toBeInTheDocument();
  });
});
