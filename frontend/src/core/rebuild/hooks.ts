import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearRebuildLogs,
  loadRebuildLogs,
  runMemoryRebuild,
} from "./api";

export function useRunMemoryRebuild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runMemoryRebuild(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rebuild"] });
      void queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

export function useRebuildLogs() {
  return useQuery({
    queryKey: ["rebuild", "logs"],
    queryFn: () => loadRebuildLogs(),
  });
}

export function useClearRebuildLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearRebuildLogs(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rebuild"] });
    },
  });
}
