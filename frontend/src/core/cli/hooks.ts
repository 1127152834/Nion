import { useQuery } from "@tanstack/react-query";

import { loadCLIConfig } from "./api";

export function useCLIConfig({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cliConfig"],
    queryFn: () => loadCLIConfig(),
    enabled,
  });
  return { config: data ?? null, isLoading, error };
}

