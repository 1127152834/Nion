import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearCompactionLogs,
  loadCompactionLogs,
  loadMemoryUsage,
  runMemoryCompaction,
} from "./api";

export function useRunMemoryCompaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ratio, decay_days = 0 }: { ratio: number; decay_days?: number }) =>
      runMemoryCompaction(ratio, decay_days),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["compaction"] });
      void queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

export function useCompactionLogs() {
  return useQuery({
    queryKey: ["compaction", "logs"],
    queryFn: () => loadCompactionLogs(),
  });
}

export function useClearCompactionLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearCompactionLogs(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["compaction"] });
    },
  });
}

export function useMemoryUsage() {
  return useQuery({
    queryKey: ["memory", "usage"],
    queryFn: () => loadMemoryUsage(),
  });
}
