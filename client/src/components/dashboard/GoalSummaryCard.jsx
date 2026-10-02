import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import { formatMoney } from '../../utils/format.js';

const MAX_GOALS_SHOWN = 3;

/** Compact summary of active (not-yet-completed) goals for the Dashboard. */
export default function GoalSummaryCard({ goals, currency }) {
  const activeGoals = goals.filter((goal) => goal.status !== 'completed').slice(0, MAX_GOALS_SHOWN);

  return (
    <Card title="Savings goals" action={<Link to="/goals" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>}>
      {goals.length === 0 && <EmptyState title="No goals yet" description="Set a savings goal to start tracking progress." />}
      {goals.length > 0 && activeGoals.length === 0 && (
        <p className="text-sm text-slate-500">All your goals are complete. Nice work!</p>
      )}
      {activeGoals.length > 0 && (
        <ul className="flex flex-col gap-4">
          {activeGoals.map((goal) => (
            <li key={goal.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-900">{goal.name}</span>
                <span className="text-slate-500">{goal.progressPercent}%</span>
              </div>
              <ProgressBar percent={goal.progressPercent} />
              <p className="mt-1 text-xs text-slate-500">
                {formatMoney(goal.remainingAmount, currency)} remaining of {formatMoney(goal.targetAmount, currency)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
