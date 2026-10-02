import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as assetService from '../services/assetService.js';
import * as liabilityService from '../services/liabilityService.js';
import * as wealthService from '../services/wealthService.js';

export function useWealthSummary() {
  return useQuery({ queryKey: ['wealthSummary'], queryFn: wealthService.fetchWealthSummary });
}

export function useAssets() {
  return useQuery({ queryKey: ['assets'], queryFn: assetService.fetchAssets });
}

export function useLiabilities() {
  return useQuery({ queryKey: ['liabilities'], queryFn: liabilityService.fetchLiabilities });
}

/** Any asset/liability/snapshot change can move the totals, allocation, and history. */
function useInvalidateWealth() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['liabilities'] });
    queryClient.invalidateQueries({ queryKey: ['wealthSummary'] });
  };
}

export function useCreateAsset() {
  const invalidate = useInvalidateWealth();
  return useMutation({ mutationFn: assetService.createAsset, onSuccess: invalidate });
}

export function useUpdateAsset() {
  const invalidate = useInvalidateWealth();
  return useMutation({
    mutationFn: ({ id, payload }) => assetService.updateAsset(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteAsset() {
  const invalidate = useInvalidateWealth();
  return useMutation({ mutationFn: assetService.deleteAsset, onSuccess: invalidate });
}

export function useCreateLiability() {
  const invalidate = useInvalidateWealth();
  return useMutation({ mutationFn: liabilityService.createLiability, onSuccess: invalidate });
}

export function useUpdateLiability() {
  const invalidate = useInvalidateWealth();
  return useMutation({
    mutationFn: ({ id, payload }) => liabilityService.updateLiability(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteLiability() {
  const invalidate = useInvalidateWealth();
  return useMutation({ mutationFn: liabilityService.deleteLiability, onSuccess: invalidate });
}

export function useRecordSnapshot() {
  const invalidate = useInvalidateWealth();
  return useMutation({ mutationFn: wealthService.recordSnapshot, onSuccess: invalidate });
}
