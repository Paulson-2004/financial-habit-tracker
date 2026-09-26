import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { goalFormSchema } from '../../schemas/goalSchemas.js';

/** Add/edit form for one savings goal. Used inside a Modal by GoalsPage. */
export default function GoalForm({ defaultValues, onSubmit, onCancel, isSubmitting, serverError }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(goalFormSchema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

      <Input label="Goal name" placeholder="e.g. Emergency fund" error={errors.name?.message} {...register('name')} />

      <Input
        label="Target amount"
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        error={errors.targetAmount?.message}
        {...register('targetAmount')}
      />

      <Input
        label="Target date (optional)"
        type="date"
        error={errors.targetDate?.message}
        {...register('targetDate')}
      />

      <Input
        label="Description (optional)"
        placeholder="What is this goal for?"
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
