import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import { formatDate, formatMoney } from '../../utils/format.js';

/** Most recent transactions for the Dashboard - a read-only preview, not the full tracker. */
export default function RecentTransactions({ transactions, currency }) {
  return (
    <Card title="Recent activity" action={<Link to="/transactions" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>}>
      {transactions.length === 0 && <EmptyState title="No transactions yet" description="Add your first income or expense to see it here." />}
      {transactions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{transaction.description ?? transaction.category.name}</p>
                <p className="text-xs text-slate-500">
                  {transaction.category.name} · {formatDate(transaction.date)}
                </p>
              </div>
              <span className={`shrink-0 tabular-nums font-medium ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                {transaction.type === 'income' ? '+' : '-'}
                {formatMoney(transaction.amount, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
