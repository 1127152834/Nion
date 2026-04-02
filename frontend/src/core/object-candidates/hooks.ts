import { useMutation, useQuery } from "@tanstack/react-query";

import {
  applyObjectCandidate,
  deferObjectCandidate,
  dismissObjectCandidate,
  getObjectCandidate,
  listObjectCandidates,
} from "./api";

export function useObjectCandidates() {
  return useQuery({
    queryKey: ["object-candidates"],
    queryFn: listObjectCandidates,
  });
}

export function useObjectCandidate(candidateId: string | null) {
  return useQuery({
    queryKey: ["object-candidates", candidateId],
    queryFn: () => getObjectCandidate(candidateId!),
    enabled: Boolean(candidateId),
  });
}

export function useApplyObjectCandidate() {
  return useMutation({
    mutationFn: (candidateId: string) => applyObjectCandidate(candidateId),
  });
}

export function useDismissObjectCandidate() {
  return useMutation({
    mutationFn: ({
      candidateId,
      input,
    }: {
      candidateId: string;
      input: Parameters<typeof dismissObjectCandidate>[1];
    }) => dismissObjectCandidate(candidateId, input),
  });
}

export function useDeferObjectCandidate() {
  return useMutation({
    mutationFn: ({
      candidateId,
      input,
    }: {
      candidateId: string;
      input: Parameters<typeof deferObjectCandidate>[1];
    }) => deferObjectCandidate(candidateId, input),
  });
}
