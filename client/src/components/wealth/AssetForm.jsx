import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { ASSET_CATEGORIES, ASSET_CATEGORY_LABELS, assetFormSchema } from '../../schemas/wealthSchemas.js';

/** Add/edit form for one asset. Used inside a Modal by WealthPage. */
export default function AssetForm({ defaultValues, onSubmit, onCancel, isSubmitting, serverError }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(assetFormSchema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

      <Input label="Asset name" placeholder="e.g. Savings account" error={errors.name?.message} {...register('name')} />

      <div className="flex flex-col gap-1">
        <label htmlFor="asset-category" className="text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="asset-category"
          {...register('category')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select a category</option>
          {ASSET_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {ASSET_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
      </div>

      <Input label="Current value" type="number" step="0.01" min="0" inputMode="decimal" error={errors.value?.message} {...register('value')} />

      <Input label="Notes (optional)" placeholder="e.g. Joint account with spouse" error={errors.description?.message} {...register('description')} />

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
