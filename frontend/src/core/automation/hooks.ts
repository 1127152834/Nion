import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAPIClient } from "../api";
import { extractContentFromMessage } from "../messages/utils";
import type { AgentThreadState } from "../threads/types";

import {
  createAutomationJob,
  loadAutomationJob,
  loadAutomationJobs,
  loadAutomationRuns,
  loadAutomationStatus,
  pauseAutomationJob,
  removeAutomationJob,
  resumeAutomationJob,
  runAutomationJob,
  updateAutomationJob,
} from "./api";
import type { AutomationThreadPreview } from "./presentation";
import type { AutomationJobCreateInput } from "./types";

export function useAutomationJobs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "jobs"],
    queryFn: () => loadAutomationJobs(),
    refetchOnWindowFocus: false,
  });
  return { jobs: data ?? [], isLoading, error };
}

export function useAutomationJob(jobId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "jobs", jobId],
    queryFn: () => loadAutomationJob(jobId),
    enabled: Boolean(jobId),
    refetchOnWindowFocus: false,
  });
  return { job: data ?? null, isLoading, error };
}

export function useAutomationRuns() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "runs"],
    queryFn: () => loadAutomationRuns(),
    refetchOnWindowFocus: false,
  });
  return { runs: data ?? [], isLoading, error };
}

export function useAutomationStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "status"],
    queryFn: () => loadAutomationStatus(),
    refetchOnWindowFocus: false,
  });
  return { status: data ?? null, isLoading, error };
}

export function useAutomationRunThreadPreview(threadId: string | null | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "thread-preview", threadId ?? null],
    queryFn: async () => {
      if (!threadId) {
        throw new Error("threadId is required");
      }
      const apiClient = getAPIClient();
      const thread = await apiClient.getState<AgentThreadState>(threadId);
      return {
        title: thread.values.title || thread.thread_id,
        threadId: thread.thread_id,
        updatedAt: thread.updated_at ?? null,
        messages: (thread.values.messages ?? [])
          .map((message) => ({
            type: message.type,
            text: extractContentFromMessage(message),
          }))
          .filter((message) => message.text)
          .slice(-4),
      } satisfies AutomationThreadPreview;
    },
    enabled: Boolean(threadId),
    refetchOnWindowFocus: false,
  });

  return {
    threadPreview: data ?? null,
    isLoading,
    error,
  };
}

export function useCreateAutomationJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AutomationJobCreateInput) =>
      createAutomationJob(input),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
}

export function useUpdateAutomationJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      input,
    }: {
      jobId: string;
      input: Partial<AutomationJobCreateInput>;
    }) => updateAutomationJob(jobId, input),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
}

export function usePauseAutomationJob() {
  return useAutomationJobMutation((jobId) => pauseAutomationJob(jobId));
}

export function useResumeAutomationJob() {
  return useAutomationJobMutation((jobId) => resumeAutomationJob(jobId));
}

export function useRunAutomationJob() {
  return useAutomationJobMutation((jobId) => runAutomationJob(jobId));
}

export function useRemoveAutomationJob() {
  return useAutomationJobMutation((jobId) => removeAutomationJob(jobId));
}

function useAutomationJobMutation<T>(mutationFn: (jobId: string) => Promise<T>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
}

async function invalidateAutomationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["automation", "jobs"] }),
    queryClient.invalidateQueries({ queryKey: ["automation", "jobs"], exact: false }),
    queryClient.invalidateQueries({ queryKey: ["automation", "runs"] }),
    queryClient.invalidateQueries({ queryKey: ["automation", "status"] }),
  ]);
}
