import { useQuery } from "@tanstack/react-query";

import { loadKnowledgePage, loadKnowledgeQueue } from "./api";
import type { KnowledgePage, KnowledgeSourceCandidate } from "./types";

export function useKnowledgeQueue() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge", "queue"],
    queryFn: () => loadKnowledgeQueue(),
    refetchOnWindowFocus: false,
  });
  return {
    queue: (data ?? []) as KnowledgeSourceCandidate[],
    isLoading,
    error,
  };
}

export function useKnowledgePage(pageId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge", "page", pageId],
    queryFn: () => loadKnowledgePage(pageId!),
    enabled: Boolean(pageId),
    refetchOnWindowFocus: false,
  });
  return {
    page: (data ?? null) as KnowledgePage | null,
    isLoading,
    error,
  };
}
