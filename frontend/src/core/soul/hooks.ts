import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptSoulProposal,
  loadSoulEvents,
  loadSoulProposals,
  loadSoulSummary,
  rejectSoulProposal,
} from "./api";

export function useSoulSummary() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["soul", "summary"],
    queryFn: () => loadSoulSummary(),
  });
  return { soulSummary: data ?? null, isLoading, error, hasSoulSurface: Boolean(data) };
}

export function useSoulProposalsV2() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["soul", "proposals"],
    queryFn: () => loadSoulProposals(),
  });
  return {
    proposals: data?.proposals ?? [],
    isLoading,
    error,
    hasProposalSurface: (data?.proposals?.length ?? 0) > 0,
  };
}

export function useSoulEvents() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["soul", "events"],
    queryFn: () => loadSoulEvents(),
  });
  return {
    events: data?.events ?? [],
    isLoading,
    error,
    hasEventSurface: (data?.events?.length ?? 0) > 0,
  };
}

export function useAcceptSoulProposalV2() {
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

export function useRejectSoulProposalV2() {
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

export const useSoulProposals = useSoulProposalsV2;
export const useAcceptSoulProposal = useAcceptSoulProposalV2;
export const useRejectSoulProposal = useRejectSoulProposalV2;
