import { useQuery } from "@tanstack/react-query";

import { loadMemory } from "./api";
import type { MemoryUserFacing } from "./types";

export function useMemory() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory"],
    queryFn: () => loadMemory(),
  });
  return { memory: (data ?? null) as MemoryUserFacing | null, isLoading, error };
}
