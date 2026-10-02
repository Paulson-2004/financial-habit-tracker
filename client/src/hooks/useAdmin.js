import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as adminService from '../services/adminService.js';

export function useAdminOverview() {
  return useQuery({ queryKey: ['admin', 'overview'], queryFn: adminService.fetchAdminOverview });
}

export function useAdminUsers(params) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminService.fetchAdminUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => adminService.setUserActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}

export function useAdminFeedback(params) {
  return useQuery({
    queryKey: ['admin', 'feedback', params],
    queryFn: () => adminService.fetchAdminFeedback(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateAdminFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => adminService.updateAdminFeedback(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}
