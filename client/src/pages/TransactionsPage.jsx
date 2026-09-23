import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import TransactionForm from '../components/transactions/TransactionForm.jsx';
import { useProfile } from '../hooks/useProfile.js';
import {
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useTransactionSummary,
  useTransactions,
  useUpdateTransaction,
} from '../hooks/useTransactions.js';
import { defaultTransactionFormValues } from '../schemas/transactionSchemas.js';
import { formatDate, formatMoney } from '../utils/format.js';

const PAGE_SIZE = 10;

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function SummaryCard({ label, value, tone }) {
  const toneClass = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-red-600' : 'text-slate-900';
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </Card>
  );
}

export default function TransactionsPage() {
  const [month, setMonth] = useState(currentMonthValue);
  const [type, setType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalState, setModalState] = useState(null); // null | 'create' | transaction object to edit

  const { data: profile } = useProfile();
  const currency = profile?.currency ?? 'INR';

  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useTransactionSummary(month);
  const { data: filterCategories = [] } = useCategories(type || undefined);
  const {
    data: listResult,
    isLoading: listLoading,
    isError: listError,
  } = useTransactions({ month, type: type || undefined, categoryId: categoryId || undefined, search: search || undefined, page, pageSize: PAGE_SIZE });

  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  function updateFilterAndResetPage(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }
  const handleMonthChange = updateFilterAndResetPage(setMonth);
  const handleTypeChange = updateFilterAndResetPage((value) => {
    setType(value);
    setCategoryId(''); // the previous category may not belong to the newly selected type
  });
  const handleCategoryChange = updateFilterAndResetPage(setCategoryId);
  const handleSearchChange = updateFilterAndResetPage(setSearch);

  function buildPayload(values) {
    return {
      type: values.type,
      categoryId: values.categoryId,
      amount: Number(values.amount),
      transactionDate: values.transactionDate,
      description: values.description.trim() === '' ? undefined : values.description.trim(),
    };
  }

  async function handleCreate(values) {
    try {
      await createTransaction.mutateAsync(buildPayload(values));
      toast.success('Transaction added');
      setModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not add transaction');
    }
  }

  async function handleUpdate(values) {
    try {
      await updateTransaction.mutateAsync({ id: modalState.id, payload: buildPayload(values) });
      toast.success('Transaction updated');
      setModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not update transaction');
    }
  }

  async function handleDelete(transaction) {
    if (!window.confirm(`Delete this ${transaction.type} of ${formatMoney(transaction.amount, currency)}?`)) return;
    try {
      await deleteTransaction.mutateAsync(transaction.id);
      toast.success('Transaction deleted');
    } catch (error) {
      toast.error(error.message ?? 'Could not delete transaction');
    }
  }

  const isEditing = modalState && modalState !== 'create';
  const formDefaultValues = isEditing
    ? {
        type: modalState.type,
        categoryId: modalState.category.id,
        amount: String(modalState.amount),
        transactionDate: modalState.date,
        description: modalState.description ?? '',
      }
    : defaultTransactionFormValues;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Expense &amp; Income Tracker</h1>
        <Button onClick={() => setModalState('create')}>Add transaction</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Income"
          value={summaryLoading || summaryError ? '—' : formatMoney(summary.income, currency)}
          tone="positive"
        />
        <SummaryCard
          label="Expenses"
          value={summaryLoading || summaryError ? '—' : formatMoney(summary.expenses, currency)}
          tone="negative"
        />
        <SummaryCard
          label="Net Savings"
          value={summaryLoading || summaryError ? '—' : formatMoney(summary.netSavings, currency)}
          tone={summaryLoading || summaryError ? undefined : summary.netSavings >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="month-filter" className="text-sm font-medium text-slate-700">
              Month
            </label>
            <input
              id="month-filter"
              type="month"
              value={month}
              onChange={(event) => handleMonthChange(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="type-filter" className="text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              id="type-filter"
              value={type}
              onChange={(event) => handleTypeChange(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="category-filter" className="text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              id="category-filter"
              value={categoryId}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {filterCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="search-filter" className="text-sm font-medium text-slate-700">
              Search description
            </label>
            <input
              id="search-filter"
              type="search"
              placeholder="e.g. rent"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      <Card>
        {listLoading && <Spinner label="Loading transactions..." />}
        {listError && <p className="text-sm text-red-600">Could not load transactions. Please try again.</p>}
        {!listLoading && !listError && listResult.data.length === 0 && (
          <EmptyState title="No transactions found" description="Try a different month or clear your filters." />
        )}

        {!listLoading && !listError && listResult.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Category</th>
                    <th className="py-2 pr-4 font-medium">Description</th>
                    <th className="py-2 pr-4 text-right font-medium">Amount</th>
                    <th className="py-2 pl-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listResult.data.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap text-slate-600">{formatDate(transaction.date)}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: transaction.category.color }} />
                          {transaction.category.name}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{transaction.description ?? '-'}</td>
                      <td
                        className={`py-3 pr-4 text-right tabular-nums font-medium ${
                          transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatMoney(transaction.amount, currency)}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <button
                          className="mr-3 text-sm font-medium text-brand-600 hover:underline"
                          onClick={() => setModalState(transaction)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm font-medium text-red-600 hover:underline"
                          onClick={() => handleDelete(transaction)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>
                Page {listResult.meta.page} of {listResult.meta.totalPages} ({listResult.meta.total} total)
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= listResult.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal title={isEditing ? 'Edit transaction' : 'Add transaction'} isOpen={Boolean(modalState)} onClose={() => setModalState(null)}>
        <TransactionForm
          key={isEditing ? modalState.id : 'create'}
          defaultValues={formDefaultValues}
          onSubmit={isEditing ? handleUpdate : handleCreate}
          onCancel={() => setModalState(null)}
          isSubmitting={createTransaction.isPending || updateTransaction.isPending}
        />
      </Modal>
    </div>
  );
}
