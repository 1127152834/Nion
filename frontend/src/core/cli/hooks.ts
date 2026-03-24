import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { loadCLIConfig, updateCLIConfigItem } from "./api";
import type { CLIStateConfigUpdatePayload } from "./types";

export function useCLIConfig({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cliConfig"],
    queryFn: () => loadCLIConfig(),
    enabled,
  });
  return { config: data ?? null, isLoading, error };
}

export function useUpdateCLIConfigItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cliId,
      payload,
    }: {
      cliId: string;
      payload: CLIStateConfigUpdatePayload;
    }) => updateCLIConfigItem(cliId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cliConfig"] });
    },
  });
}
