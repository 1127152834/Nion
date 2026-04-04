import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  freezeMemoryGrowthItem,
  loadMemoryGrowth,
  rejectMemoryGrowthItem,
} from "./api";

export function useMemoryGrowth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-growth"],
    queryFn: () => loadMemoryGrowth(),
  });
  return { growth: data ?? null, isLoading, error };
}

export function useFreezeMemoryGrowthItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => freezeMemoryGrowthItem(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-growth"] });
    },
  });
}

export function useRejectMemoryGrowthItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memoryId: string) => rejectMemoryGrowthItem(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-growth"] });
    },
  });
}
