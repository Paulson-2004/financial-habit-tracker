import Card from '../components/ui/Card.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import BreakdownDonutChart from '../components/charts/BreakdownDonutChart.jsx';
import NetWorthChart from '../components/charts/NetWorthChart.jsx';
import GoalSummaryCard from '../components/dashboard/GoalSummaryCard.jsx';
import HabitSummaryCard from '../components/dashboard/HabitSummaryCard.jsx';
import RecentTransactions from '../components/dashboard/RecentTransactions.jsx';
import { useGoals } from '../hooks/useGoals.js';
import { useHabits } from '../hooks/useHabits.js';
import { useCurrency } from '../hooks/useProfile.js';
import { useTransactions, useTransactionSummary } from '../hooks/useTransactions.js';
import { useWealthSummary } from '../hooks/useWealth.js';
import { ASSET_CATEGORY_LABELS } from '../schemas/wealthSchemas.js';
import { amountTone, toBreakdownSlices } from '../utils/wealth.js';
import { formatMoney } from '../utils/format.js';

const RECENT_TRANSACTIONS_COUNT = 5;

export default function DashboardPage() {
  const currency = useCurrency();

  const { data: cashFlow, isLoading: cashFlowLoading, isError: cashFlowError } = useTransactionSummary();
  const { data: wealth, isLoading: wealthLoading, isError: wealthError } = useWealthSummary();
  const { data: goals, isLoading: goalsLoading, isError: goalsError } = useGoals();
  const { data: habits, isLoading: habitsLoading, isError: habitsError } = useHabits();
  const {
    data: recentResult,
    isLoading: recentLoading,
    isError: recentError,
  } = useTransactions({ page: 1, pageSize: RECENT_TRANSACTIONS_COUNT });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Financial overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Income (this month)" value={cashFlowLoading || cashFlowError ? '—' : formatMoney(cashFlow.income, currency)} tone="positive" />
          <StatCard label="Expenses (this month)" value={cashFlowLoading || cashFlowError ? '—' : formatMoney(cashFlow.expenses, currency)} tone="negative" />
          <StatCard
            label="Net savings"
            value={cashFlowLoading || cashFlowError ? '—' : formatMoney(cashFlow.netSavings, currency)}
            tone={cashFlowLoading || cashFlowError ? 'neutral' : amountTone(cashFlow.netSavings)}
          />
          <StatCard
            label="Savings rate"
            value={cashFlowLoading || cashFlowError ? '—' : cashFlow.savingsRate === null ? '—' : `${cashFlow.savingsRate}%`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Wealth overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total assets" value={wealthLoading || wealthError ? '—' : formatMoney(wealth.totalAssets, currency)} />
          <StatCard label="Total liabilities" value={wealthLoading || wealthError ? '—' : formatMoney(wealth.totalLiabilities, currency)} />
          <StatCard
            label="Net worth"
            value={wealthLoading || wealthError ? '—' : formatMoney(wealth.netWorth, currency)}
            tone={wealthLoading || wealthError ? 'neutral' : amountTone(wealth.netWorth)}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Net worth growth">
          {wealthLoading ? <Spinner label="Loading..." /> : <NetWorthChart history={wealth?.netWorthHistory} currency={currency} />}
        </Card>
        <Card title="Asset allocation">
          {wealthLoading ? (
            <Spinner label="Loading..." />
          ) : (
            <BreakdownDonutChart
              slices={toBreakdownSlices(wealth?.assetAllocation ?? [], ASSET_CATEGORY_LABELS)}
              currency={currency}
              ariaLabel="Donut chart of your asset allocation by category"
              emptyTitle="No assets yet"
              emptyDescription="Add assets on the Wealth page to see your allocation."
            />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {goalsLoading || goalsError ? (
          <Card title="Savings goals">
            {goalsLoading ? <Spinner label="Loading..." /> : <p className="text-sm text-red-600">Could not load your goals.</p>}
          </Card>
        ) : (
          <GoalSummaryCard goals={goals} currency={currency} />
        )}
        {habitsLoading || habitsError ? (
          <Card title="Financial habits">
            {habitsLoading ? <Spinner label="Loading..." /> : <p className="text-sm text-red-600">Could not load your habits.</p>}
          </Card>
        ) : (
          <HabitSummaryCard habits={habits} />
        )}
      </div>

      {recentLoading || recentError ? (
        <Card title="Recent activity">
          {recentLoading ? <Spinner label="Loading..." /> : <p className="text-sm text-red-600">Could not load recent activity.</p>}
        </Card>
      ) : (
        <RecentTransactions transactions={recentResult.data} currency={currency} />
      )}
    </div>
  );
}
