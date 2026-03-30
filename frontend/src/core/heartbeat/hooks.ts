import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearHeartbeatLogs,
  loadHeartbeatLogs,
  loadHeartbeatStatus,
} from "./api";

export function useHeartbeatStatus() {
  return useQuery({
    queryKey: ["heartbeat", "status"],
    queryFn: () => loadHeartbeatStatus(),
  });
}

export function useHeartbeatLogs() {
  return useQuery({
    queryKey: ["heartbeat", "logs"],
    queryFn: () => loadHeartbeatLogs(),
  });
}

export function useClearHeartbeatLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearHeartbeatLogs(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["heartbeat"] });
    },
  });
}
