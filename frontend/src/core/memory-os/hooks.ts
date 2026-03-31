import { useQuery } from "@tanstack/react-query";

import { getMemoryProviderState, listMemoryProviderFamilies } from "./api";
import type {
  ActiveMemoryProviderSummary,
  MemoryProviderFamily,
  MemoryProviderState,
} from "./types";

export function useMemoryProviderFamilies() {
  return useQuery({
    queryKey: ["memory-os", "provider-families"],
    queryFn: listMemoryProviderFamilies,
  });
}

export function useMemoryProviderState() {
  return useQuery({
    queryKey: ["memory-os", "provider-state"],
    queryFn: getMemoryProviderState,
  });
}

export function resolveActiveMemoryProviderSummary(params: {
  families: MemoryProviderFamily[];
  state: MemoryProviderState | undefined;
}): ActiveMemoryProviderSummary | null {
  const activeProvider = params.state?.active_provider;
  if (activeProvider) {
    return activeProvider;
  }

  const activeFamily = params.state?.active_provider_family;
  if (!activeFamily) {
    return null;
  }

  const family = params.families.find((item: MemoryProviderFamily) => item.family === activeFamily);
  if (!family) {
    return null;
  }

  return {
    family: family.family,
    display_name: family.display_name,
    runtime_mode: "unknown",
    health: "unknown",
    capabilities: family.capabilities,
    status_summary: null,
    usage_summary: null,
  };
}
