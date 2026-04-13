import { useQuery } from "@tanstack/react-query";

import {
  closeKnowledgeRevision,
  createKnowledgeRevision,
  loadKnowledgePage,
  loadKnowledgeQueue,
  queryKnowledge,
  rebuildKnowledgeGraph,
} from "./api";
import { useMutation } from "@tanstack/react-query";
import type {
  KnowledgeGraphPayload,
  KnowledgePage,
  KnowledgeQueryResult,
  KnowledgeRevisionRequest,
  KnowledgeSourceCandidate,
} from "./types";

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

export function useKnowledgeQuery(question: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge", "query", question],
    queryFn: () => queryKnowledge(question!),
    enabled: Boolean(question && question.trim().length > 0),
    refetchOnWindowFocus: false,
  });
  return {
    result: (data ?? null) as KnowledgeQueryResult | null,
    isLoading,
    error,
  };
}

export function useRebuildKnowledgeGraph() {
  return useMutation({
    mutationFn: async () => rebuildKnowledgeGraph(),
  });
}

export function useCreateKnowledgeRevision() {
  return useMutation({
    mutationFn: async (input: {
      page_id: string;
      request_type: string;
      instruction: string;
      optional_source_refs: string[];
    }) => createKnowledgeRevision(input),
  });
}

export function useCloseKnowledgeRevision() {
  return useMutation({
    mutationFn: async (requestId: string) => closeKnowledgeRevision(requestId),
  });
}
