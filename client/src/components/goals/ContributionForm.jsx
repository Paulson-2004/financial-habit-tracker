import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { contributionFormSchema, defaultContributionFormValues } from '../../schemas/goalSchemas.js';

/** Add-contribution form. Used inside a Modal by GoalsPage. */
export default function ContributionForm({ onSubmit, onCancel, isSubmitting, serverError }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(contributionFormSchema), defaultValues: defaultContributionFormValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

      <Input
        label="Amount"
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        error={errors.amount?.message}
        {...register('amount')}
      />

      <Input label="Date" type="date" error={errors.contributionDate?.message} {...register('contributionDate')} />

      <Input label="Note (optional)" placeholder="e.g. Year-end bonus" error={errors.note?.message} {...register('note')} />

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Add contribution
        </Button>
      </div>
    </form>
  );
}
