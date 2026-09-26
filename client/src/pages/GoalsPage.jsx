import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ContributionForm from '../components/goals/ContributionForm.jsx';
import GoalForm from '../components/goals/GoalForm.jsx';
import {
  useAddContribution,
  useContributions,
  useCreateGoal,
  useDeleteContribution,
  useDeleteGoal,
  useGoals,
  useUpdateGoal,
} from '../hooks/useGoals.js';
import { useProfile } from '../hooks/useProfile.js';
import { defaultGoalFormValues } from '../schemas/goalSchemas.js';
import { formatDate, formatMoney } from '../utils/format.js';

const STATUS_STYLES = {
  completed: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  in_progress: 'bg-slate-100 text-slate-600',
};
const STATUS_LABELS = { completed: 'Completed', overdue: 'Overdue', in_progress: 'In progress' };

function ContributionHistory({ goalId, currency }) {
  const { data: contributions, isLoading, isError } = useContributions(goalId, true);
  const deleteContribution = useDeleteContribution();

  async function handleDelete(contributionId) {
    if (!window.confirm('Remove this contribution?')) return;
    try {
      await deleteContribution.mutateAsync({ goalId, contributionId });
      toast.success('Contribution removed');
    } catch (error) {
      toast.error(error.message ?? 'Could not remove contribution');
    }
  }

  if (isLoading) return <Spinner label="Loading contributions..." />;
  if (isError) return <p className="text-sm text-red-600">Could not load contributions.</p>;
  if (contributions.length === 0) return <p className="text-sm text-slate-500">No contributions yet.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {contributions.map((contribution) => (
        <li key={contribution.id} className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium text-slate-900">{formatMoney(contribution.amount, currency)}</span>
            <span className="ml-2 text-slate-500">{formatDate(contribution.contributionDate)}</span>
            {contribution.note && <span className="ml-2 text-slate-400">- {contribution.note}</span>}
          </div>
          <button className="text-red-600 hover:underline" onClick={() => handleDelete(contribution.id)}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function GoalCard({ goal, currency, onEdit, onDelete, onAddContribution, isExpanded, onToggleExpanded }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900">{goal.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[goal.status]}`}>
              {STATUS_LABELS[goal.status]}
            </span>
          </div>
          {goal.description && <p className="mt-0.5 text-sm text-slate-500">{goal.description}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
          <button className="font-medium text-brand-600 hover:underline" onClick={onEdit}>
            Edit
          </button>
          <button className="font-medium text-red-600 hover:underline" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar percent={goal.progressPercent} tone={goal.status === 'completed' ? 'positive' : 'brand'} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            <span className="font-medium text-slate-900">{formatMoney(goal.contributedAmount, currency)}</span> of{' '}
            {formatMoney(goal.targetAmount, currency)} ({goal.progressPercent}%)
          </span>
          <span>{formatMoney(goal.remainingAmount, currency)} remaining</span>
        </div>
        {goal.targetDate && <p className="mt-1 text-xs text-slate-400">Target date: {formatDate(goal.targetDate)}</p>}
        {goal.overfundedBy > 0 && (
          <p className="mt-1 text-xs text-emerald-600">Overfunded by {formatMoney(goal.overfundedBy, currency)}</p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Button variant="secondary" onClick={onAddContribution}>
          Add contribution
        </Button>
        <button className="text-sm font-medium text-brand-600 hover:underline" onClick={onToggleExpanded}>
          {isExpanded ? 'Hide contributions' : 'View contributions'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ContributionHistory goalId={goal.id} currency={currency} />
        </div>
      )}
    </Card>
  );
}

export default function GoalsPage() {
  const [goalModalState, setGoalModalState] = useState(null); // null | 'create' | goal object
  const [contributionGoalId, setContributionGoalId] = useState(null);
  const [expandedGoalId, setExpandedGoalId] = useState(null);

  const { data: profile } = useProfile();
  const currency = profile?.currency ?? 'INR';

  const { data: goals, isLoading, isError } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const addContribution = useAddContribution();

  function buildGoalPayload(values) {
    return {
      name: values.name,
      targetAmount: Number(values.targetAmount),
      targetDate: values.targetDate.trim() === '' ? undefined : values.targetDate,
      description: values.description.trim() === '' ? undefined : values.description.trim(),
    };
  }

  async function handleCreateGoal(values) {
    try {
      await createGoal.mutateAsync(buildGoalPayload(values));
      toast.success('Goal added');
      setGoalModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not add goal');
    }
  }

  async function handleUpdateGoal(values) {
    try {
      await updateGoal.mutateAsync({ id: goalModalState.id, payload: buildGoalPayload(values) });
      toast.success('Goal updated');
      setGoalModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not update goal');
    }
  }

  async function handleDeleteGoal(goal) {
    if (!window.confirm(`Delete "${goal.name}"? This also removes its contribution history.`)) return;
    try {
      await deleteGoal.mutateAsync(goal.id);
      toast.success('Goal deleted');
    } catch (error) {
      toast.error(error.message ?? 'Could not delete goal');
    }
  }

  async function handleAddContribution(values) {
    try {
      await addContribution.mutateAsync({
        goalId: contributionGoalId,
        payload: { amount: Number(values.amount), contributionDate: values.contributionDate, note: values.note.trim() === '' ? undefined : values.note.trim() },
      });
      toast.success('Contribution added');
      setContributionGoalId(null);
      setExpandedGoalId(contributionGoalId);
    } catch (error) {
      toast.error(error.message ?? 'Could not add contribution');
    }
  }

  const isEditingGoal = goalModalState && goalModalState !== 'create';
  const goalFormDefaultValues = isEditingGoal
    ? {
        name: goalModalState.name,
        description: goalModalState.description ?? '',
        targetAmount: String(goalModalState.targetAmount),
        targetDate: goalModalState.targetDate ?? '',
      }
    : defaultGoalFormValues;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Savings Goals</h1>
        <Button onClick={() => setGoalModalState('create')}>Add goal</Button>
      </div>

      {isLoading && (
        <Card>
          <Spinner label="Loading goals..." />
        </Card>
      )}
      {isError && (
        <Card>
          <p className="text-sm text-red-600">Could not load your goals. Please try again.</p>
        </Card>
      )}
      {!isLoading && !isError && goals.length === 0 && (
        <EmptyState title="No savings goals yet" description="Add a goal to start tracking your progress." />
      )}

      {!isLoading && !isError && goals.length > 0 && (
        <div className="flex flex-col gap-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              onEdit={() => setGoalModalState(goal)}
              onDelete={() => handleDeleteGoal(goal)}
              onAddContribution={() => setContributionGoalId(goal.id)}
              isExpanded={expandedGoalId === goal.id}
              onToggleExpanded={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
            />
          ))}
        </div>
      )}

      <Modal
        title={isEditingGoal ? 'Edit goal' : 'Add goal'}
        isOpen={Boolean(goalModalState)}
        onClose={() => setGoalModalState(null)}
      >
        <GoalForm
          key={isEditingGoal ? goalModalState.id : 'create'}
          defaultValues={goalFormDefaultValues}
          onSubmit={isEditingGoal ? handleUpdateGoal : handleCreateGoal}
          onCancel={() => setGoalModalState(null)}
          isSubmitting={createGoal.isPending || updateGoal.isPending}
        />
      </Modal>

      <Modal title="Add contribution" isOpen={Boolean(contributionGoalId)} onClose={() => setContributionGoalId(null)}>
        <ContributionForm
          onSubmit={handleAddContribution}
          onCancel={() => setContributionGoalId(null)}
          isSubmitting={addContribution.isPending}
        />
      </Modal>
    </div>
  );
}
