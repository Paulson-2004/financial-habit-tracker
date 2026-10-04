import { useState } from 'react';
import { Bell, CheckCircle2, Circle, Flame, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import HabitForm from '../components/habits/HabitForm.jsx';
import {
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useMarkCompletion,
  useUndoCompletion,
  useUpdateHabit,
} from '../hooks/useHabits.js';
import {
  defaultHabitFormValues,
  HABIT_CATEGORY_LABELS,
  HABIT_FREQUENCY_LABELS,
  HABIT_PERIOD_LABELS,
} from '../schemas/habitSchemas.js';
import { localToday } from '../utils/dates.js';

function StreakStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="font-medium text-slate-900">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function HabitCard({ habit, onEdit, onDelete, onToggleCompletion, isToggling }) {
  const periodLabel = HABIT_PERIOD_LABELS[habit.frequency] || 'Today';

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col items-center shrink-0">
          <button
            type="button"
            onClick={onToggleCompletion}
            disabled={isToggling}
            aria-pressed={habit.completedToday}
            aria-label={habit.completedToday ? `Mark as not done (${periodLabel})` : `Mark as done (${periodLabel})`}
            className="mt-0.5 disabled:opacity-50"
          >
            {habit.completedToday ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            ) : (
              <Circle className="h-7 w-7 text-slate-300 hover:text-slate-400" />
            )}
          </button>
          <span className="mt-0.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">{periodLabel}</span>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{habit.name}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {HABIT_FREQUENCY_LABELS[habit.frequency] || 'Daily'}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {HABIT_CATEGORY_LABELS[habit.category]}
            </span>
            {habit.reminderEnabled && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Bell className="h-3 w-3 text-amber-500" />
                {habit.reminderTime || 'Reminder'}
              </span>
            )}
          </div>
          {habit.description && <p className="mt-0.5 text-sm text-slate-500">{habit.description}</p>}
          <div className="mt-2 flex gap-4">
            <StreakStat icon={Flame} label="current streak" value={habit.currentStreak} />
            <StreakStat icon={Trophy} label="longest" value={habit.longestStreak} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
          <button className="font-medium text-brand-600 hover:underline" onClick={onEdit}>
            Edit
          </button>
          <button className="font-medium text-red-600 hover:underline" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function HabitsPage() {
  const [modalState, setModalState] = useState(null); // null | 'create' | habit object

  const { data: habits = [], isLoading, isError } = useHabits();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const markCompletion = useMarkCompletion();
  const undoCompletion = useUndoCompletion();

  function buildPayload(values) {
    return {
      name: values.name,
      category: values.category,
      frequency: values.frequency,
      reminderEnabled: Boolean(values.reminderEnabled),
      reminderTime: values.reminderEnabled && values.reminderTime ? values.reminderTime : null,
      description: values.description?.trim() === '' ? undefined : values.description?.trim(),
    };
  }

  async function handleCreate(values) {
    try {
      await createHabit.mutateAsync(buildPayload(values));
      toast.success('Habit added');
      setModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not add habit');
    }
  }

  async function handleUpdate(values) {
    try {
      await updateHabit.mutateAsync({ id: modalState.id, payload: buildPayload(values) });
      toast.success('Habit updated');
      setModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not update habit');
    }
  }

  async function handleDelete(habit) {
    if (!window.confirm(`Delete "${habit.name}"? This also removes its completion history.`)) return;
    try {
      await deleteHabit.mutateAsync(habit.id);
      toast.success('Habit deleted');
    } catch (error) {
      toast.error(error.message ?? 'Could not delete habit');
    }
  }

  async function handleToggleCompletion(habit) {
    const today = localToday();
    try {
      if (habit.completedToday) {
        await undoCompletion.mutateAsync({ id: habit.id, date: today });
      } else {
        await markCompletion.mutateAsync({ id: habit.id, date: today });
      }
    } catch (error) {
      toast.error(error.message ?? 'Could not update completion');
    }
  }

  const isEditing = modalState && modalState !== 'create';
  const formDefaultValues = isEditing
    ? {
        name: modalState.name,
        description: modalState.description ?? '',
        category: modalState.category,
        frequency: modalState.frequency ?? 'daily',
        reminderEnabled: modalState.reminderEnabled ?? false,
        reminderTime: modalState.reminderTime ?? '20:00',
      }
    : defaultHabitFormValues;

  // Habits with active reminders that are not yet completed for the current period
  const pendingReminders = habits.filter((h) => h.reminderEnabled && !h.completedToday && h.isActive);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Habit Tracker</h1>
        <Button onClick={() => setModalState('create')}>Add habit</Button>
      </div>

      {pendingReminders.length > 0 && (
        <section
          role="region"
          aria-label="Pending habit reminders"
          className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-amber-900">Pending Habit Reminders</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
                {pendingReminders.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {h.frequency === 'weekly'
                        ? `Your weekly habit "${h.name}" is pending this week.`
                        : h.frequency === 'monthly'
                          ? `Your monthly habit "${h.name}" is due this month.`
                          : `Remember to complete your daily habit "${h.name}" today.`}
                    </span>
                    {h.reminderTime && (
                      <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {h.reminderTime}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {isLoading && (
        <Card>
          <Spinner label="Loading habits..." />
        </Card>
      )}
      {isError && (
        <Card>
          <p className="text-sm text-red-600">Could not load your habits. Please try again.</p>
        </Card>
      )}
      {!isLoading && !isError && habits.length === 0 && (
        <EmptyState title="No habits yet" description="Add a financial habit to start building a streak." />
      )}

      {!isLoading && !isError && habits.length > 0 && (
        <div className="flex flex-col gap-3">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onEdit={() => setModalState(habit)}
              onDelete={() => handleDelete(habit)}
              onToggleCompletion={() => handleToggleCompletion(habit)}
              isToggling={markCompletion.isPending || undoCompletion.isPending}
            />
          ))}
        </div>
      )}

      <Modal title={isEditing ? 'Edit habit' : 'Add habit'} isOpen={Boolean(modalState)} onClose={() => setModalState(null)}>
        <HabitForm
          key={isEditing ? modalState.id : 'create'}
          defaultValues={formDefaultValues}
          onSubmit={isEditing ? handleUpdate : handleCreate}
          onCancel={() => setModalState(null)}
          isSubmitting={createHabit.isPending || updateHabit.isPending}
        />
      </Modal>
    </div>
  );
}

