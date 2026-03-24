import { useQuery } from "@tanstack/react-query";

import { searchRecall } from "./api";

export function useRecallSearch(query: string, limit = 5, threadId?: string) {
  const trimmed = query.trim();
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["recall-search", trimmed, limit, threadId ?? null],
    queryFn: () => searchRecall(trimmed, limit, threadId),
    enabled: trimmed.length > 0,
  });

  return {
    scope: data?.scope ?? (threadId ? "thread" : "global"),
    results: data?.results ?? [],
    isLoading,
    isFetching,
    error,
  };
}
