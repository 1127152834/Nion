import { useQuery } from "@tanstack/react-query";

import { loadMemoryRuntimeTrace } from "./api";
import type {
  MemoryRuntimeTraceQuery,
  MemoryRuntimeTraceResponse,
} from "./types";

const EMPTY_MEMORY_RUNTIME_TRACE: MemoryRuntimeTraceResponse = {
  items: [],
};

export function useMemoryRuntimeTrace(query: MemoryRuntimeTraceQuery = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-runtime-trace", query],
    queryFn: () => loadMemoryRuntimeTrace(query),
  });

  return {
    trace: data ?? EMPTY_MEMORY_RUNTIME_TRACE,
    isLoading,
    error,
  };
}
