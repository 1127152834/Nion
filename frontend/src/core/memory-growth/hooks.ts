import { useQuery } from "@tanstack/react-query";

import { loadMemoryGrowth } from "./api";

export function useMemoryGrowth() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-growth"],
    queryFn: () => loadMemoryGrowth(),
  });
  return { growth: data ?? null, isLoading, error };
}
