import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as habitService from '../services/habitService.js';
import { localToday } from '../utils/dates.js';

export function useHabits() {
  const today = localToday();
  return useQuery({ queryKey: ['habits', today], queryFn: () => habitService.fetchHabits(today) });
}

function useInvalidateHabits() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['habits'] });
}

export function useCreateHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({ mutationFn: habitService.createHabit, onSuccess: invalidate });
}

export function useUpdateHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: ({ id, payload }) => habitService.updateHabit(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({ mutationFn: habitService.deleteHabit, onSuccess: invalidate });
}

export function useMarkCompletion() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: ({ id, date }) => habitService.markCompletion(id, date, localToday()),
    onSuccess: invalidate,
  });
}

export function useUndoCompletion() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: ({ id, date }) => habitService.undoCompletion(id, date, localToday()),
    onSuccess: invalidate,
  });
}
