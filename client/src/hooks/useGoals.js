import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as goalService from '../services/goalService.js';

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: goalService.fetchGoals });
}

export function useContributions(goalId, enabled) {
  return useQuery({
    queryKey: ['contributions', goalId],
    queryFn: () => goalService.fetchContributions(goalId),
    enabled,
  });
}

/** Every mutation below changes a goal's progress, and contribution ones also change its history. */
function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return (goalId) => {
    queryClient.invalidateQueries({ queryKey: ['goals'] });
    if (goalId) queryClient.invalidateQueries({ queryKey: ['contributions', goalId] });
  };
}

export function useCreateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({ mutationFn: goalService.createGoal, onSuccess: () => invalidate() });
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, payload }) => goalService.updateGoal(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({ mutationFn: goalService.deleteGoal, onSuccess: () => invalidate() });
}

export function useAddContribution() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ goalId, payload }) => goalService.addContribution(goalId, payload),
    onSuccess: (_data, { goalId }) => invalidate(goalId),
  });
}

export function useDeleteContribution() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ goalId, contributionId }) => goalService.deleteContribution(goalId, contributionId),
    onSuccess: (_data, { goalId }) => invalidate(goalId),
  });
}
