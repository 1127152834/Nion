import { useQuery } from "@tanstack/react-query";

import {
  loadMemoryFactsSurface,
  loadMemoryHistorySurface,
  loadMemoryUserSurface,
} from "./api";

export function useMemoryUserSurface() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-canonical", "user"],
    queryFn: () => loadMemoryUserSurface(),
  });
  return { user: data ?? null, isLoading, error };
}

export function useMemoryHistorySurface() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-canonical", "history"],
    queryFn: () => loadMemoryHistorySurface(),
  });
  return { history: data ?? null, isLoading, error };
}

export function useMemoryFactsSurface() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-canonical", "facts"],
    queryFn: () => loadMemoryFactsSurface(),
  });
  return { factsSurface: data ?? null, isLoading, error };
}
