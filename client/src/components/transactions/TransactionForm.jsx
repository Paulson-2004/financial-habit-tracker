import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import { useCategories } from '../../hooks/useTransactions.js';
import { transactionFormSchema } from '../../schemas/transactionSchemas.js';

/** Add/edit form for one transaction. Used inside a Modal by TransactionsPage. */
export default function TransactionForm({ defaultValues, onSubmit, onCancel, isSubmitting, serverError }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(transactionFormSchema), defaultValues });

  const type = watch('type');
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(type);

  // If the category no longer matches the chosen type (e.g. the user switched from
  // expense to income), clear it rather than silently submitting a mismatched pair -
  // the server would reject it anyway (see AGENTS.md section 12).
  useEffect(() => {
    const currentCategoryId = watch('categoryId');
    if (currentCategoryId && !categories.some((category) => category.id === currentCategoryId)) {
      setValue('categoryId', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

      <div className="flex gap-2">
        <label className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
          <input type="radio" value="expense" {...register('type')} className="accent-brand-600" />
          Expense
        </label>
        <label className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
          <input type="radio" value="income" {...register('type')} className="accent-brand-600" />
          Income
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="categoryId" className="text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="categoryId"
          {...register('categoryId')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
        >
          <option value="">{categoriesLoading ? 'Loading categories...' : 'Select a category'}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && <p className="text-sm text-red-600">{errors.categoryId.message}</p>}
      </div>

      <Input
        label="Amount"
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        error={errors.amount?.message}
        {...register('amount')}
      />

      <Input label="Date" type="date" error={errors.transactionDate?.message} {...register('transactionDate')} />

      <Input
        label="Description (optional)"
        placeholder="e.g. Groceries at the market"
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
