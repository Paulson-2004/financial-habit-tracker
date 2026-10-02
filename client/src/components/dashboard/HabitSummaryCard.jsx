import { CheckCircle2, Circle, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';

const MAX_HABITS_SHOWN = 5;

/** Compact summary of active habits for the Dashboard - today's status and current streak. */
export default function HabitSummaryCard({ habits }) {
  const shown = habits.slice(0, MAX_HABITS_SHOWN);

  return (
    <Card title="Financial habits" action={<Link to="/habits" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>}>
      {habits.length === 0 && <EmptyState title="No habits yet" description="Add a daily habit to start building a streak." />}
      {shown.length > 0 && (
        <ul className="flex flex-col gap-3">
          {shown.map((habit) => (
            <li key={habit.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-slate-900">
                {habit.completedToday ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                )}
                {habit.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Flame className="h-3.5 w-3.5 text-slate-400" />
                {habit.currentStreak}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
