import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptMemoryGrowthItemV2,
  freezeMemoryGrowthItemV2,
  loadMemoryGrowthV2,
  rejectMemoryGrowthItemV2,
  resumeMemoryGrowthItemV2,
} from "./api";

export function useMemoryGrowthV2() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-growth-v2"],
    queryFn: () => loadMemoryGrowthV2(),
  });
  return { growth: data ?? null, isLoading, error };
}

export function useFreezeMemoryGrowthItemV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoryId: string) => freezeMemoryGrowthItemV2(memoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory-growth-v2"] });
    },
  });
}

export function useRejectMemoryGrowthItemV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoryId: string) => rejectMemoryGrowthItemV2(memoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory-growth-v2"] });
    },
  });
}

export function useResumeMemoryGrowthItemV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoryId: string) => resumeMemoryGrowthItemV2(memoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory-growth-v2"] });
    },
  });
}

export function useAcceptMemoryGrowthItemV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoryId: string) => acceptMemoryGrowthItemV2(memoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["memory-growth-v2"] });
    },
  });
}
