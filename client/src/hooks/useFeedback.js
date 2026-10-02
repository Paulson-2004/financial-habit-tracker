import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as feedbackService from '../services/feedbackService.js';

export function useMyFeedback(params) {
  return useQuery({
    queryKey: ['feedback', 'mine', params],
    queryFn: () => feedbackService.fetchMyFeedback(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: feedbackService.createFeedback,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedback', 'mine'] }),
  });
}
