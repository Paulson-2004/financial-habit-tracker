import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { HABIT_CATEGORIES, HABIT_CATEGORY_LABELS, habitFormSchema } from '../../schemas/habitSchemas.js';

/** Add/edit form for one habit. Used inside a Modal by HabitsPage. */
export default function HabitForm({ defaultValues, onSubmit, onCancel, isSubmitting, serverError }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(habitFormSchema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

      <Input label="Habit name" placeholder="e.g. Log every expense" error={errors.name?.message} {...register('name')} />

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

      <Input
        label="Description (optional)"
        placeholder="e.g. Put aside at least $5"
        error={errors.description?.message}
        {...register('description')}
      />

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
