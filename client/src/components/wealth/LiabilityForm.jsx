import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { LIABILITY_CATEGORIES, LIABILITY_CATEGORY_LABELS, liabilityFormSchema } from '../../schemas/wealthSchemas.js';

/** Add/edit form for one liability. Used inside a Modal by WealthPage. */
export default function LiabilityForm({ defaultValues, onSubmit, onCancel, isSubmitting, serverError }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(liabilityFormSchema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

      <Input label="Liability name" placeholder="e.g. Car loan" error={errors.name?.message} {...register('name')} />

      <div className="flex flex-col gap-1">
        <label htmlFor="liability-category" className="text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="liability-category"
          {...register('category')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select a category</option>
          {LIABILITY_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {LIABILITY_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
      </div>

      <Input
        label="Outstanding balance"
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        error={errors.amount?.message}
        {...register('amount')}
      />

      <Input label="Notes (optional)" placeholder="e.g. 4.2 year remaining term" error={errors.description?.message} {...register('description')} />

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
