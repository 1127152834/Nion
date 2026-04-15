import { useQuery } from "@tanstack/react-query";

import {
  closeKnowledgeRevision,
  applyKnowledgeRevision,
  approveKnowledgeQueue,
  createKnowledgeRevision,
  loadKnowledgeLint,
  loadKnowledgeJobs,
  loadKnowledgePage,
  loadKnowledgePagesFromQueue,
  loadKnowledgeQueue,
  queryKnowledge,
  rebuildKnowledgeGraph,
  saveKnowledgeSynthesis,
  previewKnowledgeRevision,
} from "./api";
import { useMutation } from "@tanstack/react-query";
import type {
  KnowledgeGraphPayload,
  KnowledgeCompileJob,
  KnowledgeLintReport,
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

export function useApproveKnowledgeQueue() {
  return useMutation({
    mutationFn: async (sourceIds: string[]) => approveKnowledgeQueue(sourceIds),
  });
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

export function useKnowledgeJobs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge", "jobs"],
    queryFn: () => loadKnowledgeJobs(),
    refetchOnWindowFocus: false,
  });
  return {
    jobs: (data?.jobs ?? []) as KnowledgeCompileJob[],
    isLoading,
    error,
  };
}

export function useKnowledgePages(queue: KnowledgeSourceCandidate[]) {
  const compiledKey = queue
    .filter((item) => item.status === "compiled")
    .map((item) => `${item.source_id}:${item.content_hash}`)
    .join("|");
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge", "pages", compiledKey],
    queryFn: () => loadKnowledgePagesFromQueue(queue),
    enabled: compiledKey.length > 0,
    refetchOnWindowFocus: false,
  });
  return {
    pages: (data ?? []) as KnowledgePage[],
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

export function usePreviewKnowledgeRevision() {
  return useMutation({
    mutationFn: async (requestId: string) => previewKnowledgeRevision(requestId),
  });
}

export function useCloseKnowledgeRevision() {
  return useMutation({
    mutationFn: async (requestId: string) => closeKnowledgeRevision(requestId),
  });
}

export function useApplyKnowledgeRevision() {
  return useMutation({
    mutationFn: async (requestId: string) => applyKnowledgeRevision(requestId),
  });
}

export function useSaveKnowledgeSynthesis() {
  return useMutation({
    mutationFn: async (input: { question: string; answer_markdown: string }) =>
      saveKnowledgeSynthesis(input),
  });
}

export function useKnowledgeLint() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge", "lint"],
    queryFn: () => loadKnowledgeLint(),
    refetchOnWindowFocus: false,
  });
  return {
    report: (data ?? null) as KnowledgeLintReport | null,
    isLoading,
    error,
  };
}
