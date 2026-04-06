import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptSoulProposal,
  loadSoulProposals,
  loadSoulSummary,
  rejectSoulProposal,
} from "./api";

export function useSoulSummary() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["soul", "summary"],
    queryFn: () => loadSoulSummary(),
  });
  return { soulSummary: data ?? null, isLoading, error };
}

export function useSoulProposals() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["soul", "proposals"],
    queryFn: () => loadSoulProposals(),
  });
  return { proposals: data?.proposals ?? [], isLoading, error };
}

export function useAcceptSoulProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoryId: string) => acceptSoulProposal(memoryId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["soul"] }),
        queryClient.invalidateQueries({ queryKey: ["memory-growth"] }),
      ]);
    },
  });
}

export function useRejectSoulProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoryId: string) => rejectSoulProposal(memoryId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["soul"] }),
        queryClient.invalidateQueries({ queryKey: ["memory-growth"] }),
      ]);
    },
  });
}
