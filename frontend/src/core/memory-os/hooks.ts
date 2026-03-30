import { useQuery } from "@tanstack/react-query";

import { getMemoryProviderState, listMemoryProviderFamilies } from "./api";

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
