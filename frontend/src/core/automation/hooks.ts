import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateAutomationTemplate,
  createAutomationJob,
  decideAutomationApproval,
  exportAutomationJobTemplate,
  importAutomationTemplate,
  loadAutomationApprovals,
  loadAutomationAudit,
  loadAutomationEvent,
  loadAutomationEvents,
  loadAutomationJob,
  loadAutomationJobs,
  loadAutomationPlatformCapabilities,
  loadAutomationPlatformConnectors,
  loadAutomationRuns,
  loadAutomationStatus,
  loadAutomationTemplate,
  loadAutomationTemplates,
  pauseAutomationJob,
  requestAutomationApproval,
  resumeWorkflowRun,
  replayAutomationEvent,
  removeAutomationJob,
  resumeAutomationJob,
  runAutomationJob,
  saveAutomationTemplate,
  updateAutomationJob,
  uploadAutomationPackageFiles,
} from "./api";
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

export function useAutomationEvents(filters?: {
  category?: string;
  eventType?: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "events", filters?.category ?? "all", filters?.eventType ?? "all"],
    queryFn: () => loadAutomationEvents(filters),
    refetchOnWindowFocus: false,
  });
  return { events: data ?? [], isLoading, error };
}

export function useAutomationEvent(eventId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "events", "detail", eventId],
    queryFn: () => loadAutomationEvent(eventId),
    enabled: Boolean(eventId),
    refetchOnWindowFocus: false,
  });
  return { event: data ?? null, isLoading, error };
}

export function useReplayAutomationEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventName,
      payload,
    }: {
      eventName: string;
      payload: Record<string, unknown>;
    }) => replayAutomationEvent(eventName, payload),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
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

export function useAutomationApprovals() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "approvals"],
    queryFn: () => loadAutomationApprovals(),
    refetchOnWindowFocus: false,
  });
  return { approvals: data ?? [], isLoading, error };
}

export function useAutomationAudit() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "audit"],
    queryFn: () => loadAutomationAudit(),
    refetchOnWindowFocus: false,
  });
  return { audit: data ?? [], isLoading, error };
}

export function useAutomationTemplates() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "templates"],
    queryFn: () => loadAutomationTemplates(),
    refetchOnWindowFocus: false,
  });
  return {
    templates: data ?? { official: [], personal: [] },
    isLoading,
    error,
  };
}

export function useAutomationTemplate(templateId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "templates", "detail", templateId],
    queryFn: () => loadAutomationTemplate(templateId),
    enabled: Boolean(templateId),
    refetchOnWindowFocus: false,
  });
  return { template: data ?? null, isLoading, error };
}

export function useAutomationPlatformCapabilities() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "platform", "capabilities"],
    queryFn: () => loadAutomationPlatformCapabilities(),
    refetchOnWindowFocus: false,
  });
  return {
    capabilities: data ?? { webhook_event_versions: [], plugin_actions: [] },
    isLoading,
    error,
  };
}

export function useAutomationPlatformConnectors() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["automation", "platform", "connectors"],
    queryFn: () => loadAutomationPlatformConnectors(),
    refetchOnWindowFocus: false,
  });
  return {
    connectors: data?.connectors ?? [],
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

export function useImportAutomationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { manifest: Record<string, unknown>; files: Record<string, string> }) =>
      importAutomationTemplate(input),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
}

export function useSaveAutomationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      scope: string;
      manifest: Record<string, unknown>;
      files: Record<string, string>;
    }) => saveAutomationTemplate(input),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
}

export function useActivateAutomationTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => activateAutomationTemplate(templateId),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
}

export function useRequestAutomationApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, actor_id, reason }: { jobId: string; actor_id: string; reason: string }) =>
      requestAutomationApproval(jobId, { actor_id, reason }),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
}

export function useDecideAutomationApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ approvalId, actor_id, decision }: { approvalId: string; actor_id: string; decision: string }) =>
      decideAutomationApproval(approvalId, { actor_id, decision }),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
}

export function useExportAutomationJobTemplate(jobId: string) {
  return useMutation({
    mutationFn: async () => exportAutomationJobTemplate(jobId),
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
      input: Partial<AutomationJobCreateInput> & { delete_package_files?: string[] };
    }) => updateAutomationJob(jobId, input),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
}

export function useUploadAutomationPackageFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      files,
    }: {
      jobId: string;
      files: File[];
    }) => uploadAutomationPackageFiles(jobId, files),
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

export function useResumeWorkflowRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      runId,
      payload,
    }: {
      jobId: string;
      runId: string;
      payload: Record<string, unknown>;
    }) => resumeWorkflowRun(jobId, runId, payload),
    onSuccess: () => {
      void invalidateAutomationQueries(queryClient);
    },
  });
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
    queryClient.invalidateQueries({ queryKey: ["automation", "events"] }),
    queryClient.invalidateQueries({ queryKey: ["automation", "events", "detail"], exact: false }),
    queryClient.invalidateQueries({ queryKey: ["automation", "runs"] }),
    queryClient.invalidateQueries({ queryKey: ["automation", "status"] }),
    queryClient.invalidateQueries({ queryKey: ["automation", "approvals"] }),
    queryClient.invalidateQueries({ queryKey: ["automation", "audit"] }),
  ]);
}
