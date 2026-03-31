import { useMutation, useQuery } from "@tanstack/react-query";

import {
  clearSelfMaintenanceLogs,
  loadSelfMaintenanceLogs,
  loadSelfMaintenanceStatus,
  runSelfMaintenance,
} from "./api";
import type { SelfMaintenanceRunInput } from "./types";

export function useSelfMaintenanceRun() {
  return useMutation({
    mutationFn: async (input: SelfMaintenanceRunInput) =>
      runSelfMaintenance(input),
  });
}

export function useSelfMaintenanceStatus() {
  return useQuery({
    queryKey: ["self-maintenance", "status"],
    queryFn: loadSelfMaintenanceStatus,
  });
}

export function useSelfMaintenanceLogs() {
  return useQuery({
    queryKey: ["self-maintenance", "logs"],
    queryFn: loadSelfMaintenanceLogs,
  });
}

export function useClearSelfMaintenanceLogs() {
  return useMutation({
    mutationFn: clearSelfMaintenanceLogs,
  });
}
