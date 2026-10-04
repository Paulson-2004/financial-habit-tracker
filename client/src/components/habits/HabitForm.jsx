import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import {
  HABIT_CATEGORIES,
  HABIT_CATEGORY_LABELS,
  HABIT_FREQUENCIES,
  HABIT_FREQUENCY_LABELS,
  habitFormSchema,
} from '../../schemas/habitSchemas.js';

/** Add/edit form for one habit. Used inside a Modal by HabitsPage. */
export default function HabitForm({ defaultValues, onSubmit, onCancel, isSubmitting, serverError }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      ...defaultValues,
      frequency: defaultValues?.frequency ?? 'daily',
      reminderEnabled: defaultValues?.reminderEnabled ?? false,
      reminderTime: defaultValues?.reminderTime ?? '20:00',
    },
  });

  const reminderEnabled = watch('reminderEnabled');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

      <Input label="Habit name" placeholder="e.g. Log every expense" error={errors.name?.message} {...register('name')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="frequency" className="text-sm font-medium text-slate-700">
            Frequency
          </label>
          <select
            id="frequency"
            {...register('frequency')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          >
            {HABIT_FREQUENCIES.map((freq) => (
              <option key={freq} value={freq}>
                {HABIT_FREQUENCY_LABELS[freq]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium text-slate-700">
            Category
          </label>
          <select
            id="category"
            {...register('category')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
          >
            {HABIT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {HABIT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Description (optional)"
        placeholder="e.g. Put aside at least $5"
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label htmlFor="reminderEnabled" className="cursor-pointer text-sm font-medium text-slate-800">
              In-app reminder
            </label>
            <p className="text-xs text-slate-500">Show a reminder alert when this habit is pending</p>
          </div>
          <input
            id="reminderEnabled"
            type="checkbox"
            {...register('reminderEnabled')}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
        </div>

        {reminderEnabled && (
          <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-3">
            <label htmlFor="reminderTime" className="text-xs font-medium text-slate-700">
              Reminder time
            </label>
            <input
              id="reminderTime"
              type="time"
              {...register('reminderTime')}
              className="w-36 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
            />
            {errors.reminderTime?.message && (
              <p className="text-xs text-red-600">{errors.reminderTime.message}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save
        </Button>
      </div>
    </form>
  );
}
