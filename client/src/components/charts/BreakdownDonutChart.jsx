import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import EmptyState from '../ui/EmptyState.jsx';
import { formatMoney } from '../../utils/format.js';

// One palette for both the asset and liability charts; a slice keeps its color by rank.
export const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#64748b'];

/**
 * Donut chart plus a text legend listing every slice with its amount and share. The
 * legend doubles as the accessible/mobile-friendly form of the same data. `slices` comes
 * from utils/wealth.js#toBreakdownSlices: [{ key, name, value, percent }].
 * Renders an empty state - before touching Recharts - when there is nothing to show.
 */
export default function BreakdownDonutChart({ slices, currency, ariaLabel, emptyTitle, emptyDescription }) {
  if (!slices || slices.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div>
      <div className="h-48 w-full" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="90%" paddingAngle={2}>
              {slices.map((slice, index) => (
                <Cell key={slice.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name, item) => [`${formatMoney(value, currency)} (${item.payload.percent}%)`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        {slices.map((slice, index) => (
          <li key={slice.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-slate-700">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              {slice.name}
            </span>
            <span className="tabular-nums text-slate-600">
              {formatMoney(slice.value, currency)} <span className="text-slate-400">({slice.percent}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
