import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as transactionService from '../services/transactionService.js';

export function useCategories(type) {
  return useQuery({
    queryKey: ['categories', type ?? 'all'],
    queryFn: () => transactionService.fetchCategories(type),
    staleTime: Infinity, // system categories don't change during a session
  });
}

export function useTransactions(filters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionService.fetchTransactions(filters),
    placeholderData: keepPreviousData, // avoids a loading flash when paging/filtering
  });
}

export function useTransactionSummary(month) {
  return useQuery({
    queryKey: ['transactionSummary', month],
    queryFn: () => transactionService.fetchTransactionSummary(month),
  });
}

/** Every mutation below changes totals a filtered list/summary might already be showing. */
function useInvalidateTransactionQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactionSummary'] });
  };
}

export function useCreateTransaction() {
  const invalidate = useInvalidateTransactionQueries();
  return useMutation({ mutationFn: transactionService.createTransaction, onSuccess: invalidate });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateTransactionQueries();
  return useMutation({
    mutationFn: ({ id, payload }) => transactionService.updateTransaction(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateTransactionQueries();
  return useMutation({ mutationFn: transactionService.deleteTransaction, onSuccess: invalidate });
}
