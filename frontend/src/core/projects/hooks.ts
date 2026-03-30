import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmProjectPlanOutcome,
  createProject,
  createProjectPlan,
  createReworkPlan,
  createProjectThread,
  getProjectDashboard,
  getProjectArtifact,
  importProjectThreadSnapshot,
  listProjectDecisions,
  listProjectArtifacts,
  listProjectPlans,
  listProjects,
  listProjectThreadMentionCandidates,
  listProjectTimeline,
  listProjectThreads,
  requestProjectCompletion,
  resolveProjectDecision,
  restoreProjectArtifact,
  setPrimaryProjectPlan,
  setPrimaryProjectThread,
  startProjectPlan,
} from "./api";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });
}

export function useProjectDashboard(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", projectId, "dashboard"],
    queryFn: () => getProjectDashboard(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useProjectPlans(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", projectId, "plans"],
    queryFn: () => listProjectPlans(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useProjectThreads(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", projectId, "threads"],
    queryFn: () => listProjectThreads(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useProjectThreadMentionCandidates(
  projectId: string | null | undefined,
  threadId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["projects", projectId, "threads", threadId, "mention-candidates"],
    queryFn: () => listProjectThreadMentionCandidates(projectId!, threadId!),
    enabled: Boolean(projectId && threadId),
  });
}

export function useProjectDecisions(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", projectId, "decisions"],
    queryFn: () => listProjectDecisions(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useProjectTimeline(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", projectId, "timeline"],
    queryFn: () => listProjectTimeline(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useProjectArtifacts(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["projects", projectId, "artifacts"],
    queryFn: () => listProjectArtifacts(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useProjectArtifact(
  projectId: string | null | undefined,
  artifactId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["projects", projectId, "artifacts", artifactId],
    queryFn: () => getProjectArtifact(projectId!, artifactId!),
    enabled: Boolean(projectId && artifactId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRequestProjectCompletion(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestProjectCompletion(projectId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "decisions"] }),
      ]);
    },
  });
}

export function useCreateProjectPlan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createProjectPlan>[1]) =>
      createProjectPlan(projectId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
    },
  });
}

export function useStartProjectPlan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => startProjectPlan(projectId, planId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
    },
  });
}

export function useSetPrimaryProjectPlan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => setPrimaryProjectPlan(projectId, planId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
    },
  });
}

export function useConfirmProjectPlanOutcome(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      outcome,
    }: {
      planId: string;
      outcome: Parameters<typeof confirmProjectPlanOutcome>[2];
    }) => confirmProjectPlanOutcome(projectId, planId, outcome),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "decisions"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "timeline"] }),
      ]);
    },
  });
}

export function useCreateProjectThread(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createProjectThread>[1]) =>
      createProjectThread(projectId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "threads"] }),
        queryClient.invalidateQueries({ queryKey: ["threads", "search"] }),
      ]);
    },
  });
}

export function useCreateReworkPlan(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      input,
    }: {
      planId: string;
      input: Parameters<typeof createReworkPlan>[2];
    }) => createReworkPlan(projectId, planId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "decisions"] }),
      ]);
    },
  });
}

export function useRestoreProjectArtifact(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      artifactId,
      versionId,
      restoreReason,
    }: {
      artifactId: string;
      versionId: string;
      restoreReason?: string;
    }) =>
      restoreProjectArtifact(projectId, artifactId, {
        version_id: versionId,
        restore_reason: restoreReason,
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "artifacts"] }),
        queryClient.invalidateQueries({
          queryKey: ["projects", projectId, "artifacts", variables.artifactId],
        }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "decisions"] }),
      ]);
    },
  });
}

export function useSetPrimaryProjectThread(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => setPrimaryProjectThread(projectId, threadId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "threads"] }),
        queryClient.invalidateQueries({ queryKey: ["threads", "search"] }),
      ]);
    },
  });
}

export function useImportProjectThreadSnapshot(projectId: string, threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceThreadId: string) =>
      importProjectThreadSnapshot(projectId, threadId, {
        source_thread_id: sourceThreadId,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["threads", "search"] }),
      ]);
    },
  });
}

export function useResolveProjectDecision(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      decisionId,
      actionId,
      payload,
    }: {
      decisionId: string;
      actionId: string;
      payload?: Record<string, unknown>;
    }) =>
      resolveProjectDecision(projectId, decisionId, {
        action_id: actionId,
        payload,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "threads"] }),
        queryClient.invalidateQueries({ queryKey: ["projects", projectId, "decisions"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["threads", "search"] }),
      ]);
    },
  });
}
