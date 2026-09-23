import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as profileService from '../services/profileService.js';

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: profileService.fetchProfile });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileService.updateProfileRequest,
    onSuccess: (profile) => queryClient.setQueryData(['profile'], profile),
  });
}
