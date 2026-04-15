import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  closeKnowledgeRevision,
  applyKnowledgeRevision,
  approveKnowledgeQueue,
  createKnowledgeRevision,
  loadKnowledgeActivity,
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
import type {
  KnowledgeActivityEvent,
  KnowledgeCompileJobListResponse,
  KnowledgeCompileJob,
  KnowledgeLintReport,
  KnowledgePage,
  KnowledgeQueryResult,
  KnowledgeSourceCandidate,
} from "./types";

const KNOWLEDGE_PROGRESS_REFETCH_INTERVAL_MS = 1500;

function hasActiveKnowledgeJob(jobs: KnowledgeCompileJob[]): boolean {
  return jobs.some((job) => job.status === "pending" || job.status === "running");
}

function hasRunningKnowledgeCandidate(queue: KnowledgeSourceCandidate[]): boolean {
  return queue.some((item) => item.status === "running");
}

function shouldPollKnowledgeProgress(
  queryClient: ReturnType<typeof useQueryClient>,
  pendingApproveCount: number,
): boolean {
  if (pendingApproveCount > 0) {
    return true;
  }
  const jobs = queryClient.getQueryData<KnowledgeCompileJobListResponse>(["knowledge", "jobs"]);
  if (hasActiveKnowledgeJob(jobs?.jobs ?? [])) {
    return true;
  }
  const queue = queryClient.getQueryData<KnowledgeSourceCandidate[]>(["knowledge", "queue"]);
  return hasRunningKnowledgeCandidate(queue ?? []);
}

function useKnowledgeProgressPolling() {
  const queryClient = useQueryClient();
  const pendingApproveCount = useIsMutating({ mutationKey: ["knowledge", "approve"] });

  return {
    queryClient,
    pendingApproveCount,
    shouldPoll: shouldPollKnowledgeProgress(queryClient, pendingApproveCount),
    getRefetchInterval: (query: { state: { error: unknown } }) =>
      shouldPollKnowledgeProgress(queryClient, pendingApproveCount) && query.state.error == null
        ? KNOWLEDGE_PROGRESS_REFETCH_INTERVAL_MS
        : false,
  };
}

export function useKnowledgeQueue() {
  const { queryClient, pendingApproveCount, shouldPoll, getRefetchInterval } =
    useKnowledgeProgressPolling();
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge", "queue"],
    queryFn: () => loadKnowledgeQueue(),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => getRefetchInterval(query),
  });
  const queue = (data ?? []) as KnowledgeSourceCandidate[];
  return {
    queue,
    isLoading,
    isPolling:
      pendingApproveCount > 0 ||
      hasRunningKnowledgeCandidate(queue) ||
      shouldPoll,
    error,
  };
}

export function useApproveKnowledgeQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["knowledge", "approve"],
    mutationFn: async (sourceIds: string[]) => approveKnowledgeQueue(sourceIds),
    onMutate: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["knowledge", "queue"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge", "jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge", "activity"] }),
      ]);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["knowledge", "queue"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge", "jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge", "activity"] }),
      ]);
    },
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
  const { pendingApproveCount, shouldPoll, getRefetchInterval } = useKnowledgeProgressPolling();
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge", "jobs"],
    queryFn: () => loadKnowledgeJobs(),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => getRefetchInterval(query),
  });
  const jobs = (data?.jobs ?? []) as KnowledgeCompileJob[];
  const activeJob = jobs.find((job) => job.status === "pending" || job.status === "running") ?? null;
  return {
    jobs,
    activeJob,
    isLoading,
    isPolling:
      pendingApproveCount > 0 ||
      hasActiveKnowledgeJob(jobs) ||
      shouldPoll,
    error,
  };
}

export function useKnowledgeActivity() {
  const { getRefetchInterval } = useKnowledgeProgressPolling();
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge", "activity"],
    queryFn: () => loadKnowledgeActivity(),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => getRefetchInterval(query),
  });
  return {
    events: (data?.events ?? []) as KnowledgeActivityEvent[],
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
