import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import EmptyState from '../ui/EmptyState.jsx';
import { formatCompactMoney, formatDate, formatMoney, formatShortDate } from '../../utils/format.js';

/**
 * Line chart of net worth over recorded snapshots. `history` is the server's
 * netWorthHistory ([{ date, totalAssets, totalLiabilities, netWorth }], oldest first).
 * Renders an empty state - before touching Recharts - when there are no snapshots yet.
 */
export default function NetWorthChart({ history, currency }) {
  if (!history || history.length === 0) {
    return (
      <EmptyState
        title="No net worth history yet"
        description="Record a snapshot on the Wealth page to start tracking your growth."
      />
    );
  }

  return (
    <div className="h-64 w-full" role="img" aria-label="Line chart of your net worth over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 12 }} minTickGap={24} />
          <YAxis tickFormatter={(value) => formatCompactMoney(value, currency)} tick={{ fontSize: 12 }} width={72} />
          <Tooltip
            formatter={(value) => [formatMoney(value, currency), 'Net worth']}
            labelFormatter={(date) => formatDate(date)}
          />
          <Line type="monotone" dataKey="netWorth" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
