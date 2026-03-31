import { getBackendBaseURL } from "@/core/config";

import type {
  ExecutionPlan,
  ManagedArtifact,
  ProjectArtifactDetail,
  ProjectDashboard,
  ProjectDecisionRequest,
  ProjectListResponse,
  ProjectTimelineEvent,
  ProjectThreadLink,
} from "./types";

function projectsBaseUrl() {
  return `${getBackendBaseURL()}/api/projects`;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function listProjects(): Promise<ProjectListResponse> {
  const response = await fetch(projectsBaseUrl(), { cache: "no-store" });
  return parseJson<ProjectListResponse>(response);
}

export async function createProject(input: {
  name: string;
  description?: string;
  goal?: string;
}) {
  const response = await fetch(projectsBaseUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return parseJson<{ id: string; name: string } & Record<string, unknown>>(response);
}

export async function getProjectDashboard(projectId: string): Promise<ProjectDashboard> {
  const response = await fetch(`${projectsBaseUrl()}/${projectId}`, {
    cache: "no-store",
  });
  return parseJson<ProjectDashboard>(response);
}

export async function requestProjectCompletion(projectId: string) {
  const response = await fetch(`${projectsBaseUrl()}/${projectId}/complete`, {
    method: "POST",
  });
  return parseJson<ProjectDecisionRequest>(response);
}

export async function listProjectThreads(projectId: string): Promise<{ items: ProjectThreadLink[] }> {
  const response = await fetch(`${projectsBaseUrl()}/${projectId}/threads`, {
    cache: "no-store",
  });
  return parseJson<{ items: ProjectThreadLink[] }>(response);
}

export async function createProjectThread(
  projectId: string,
  input: {
    title?: string;
    role?: ProjectThreadLink["role"];
    linked_plan_ids?: string[];
    inherit_project_context?: boolean;
  },
) {
  const response = await fetch(`${projectsBaseUrl()}/${projectId}/threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return parseJson<ProjectThreadLink>(response);
}

export async function listProjectThreadMentionCandidates(
  projectId: string,
  threadId: string,
): Promise<{ items: ProjectThreadLink[] }> {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/threads/${threadId}/mention-candidates`,
    {
      cache: "no-store",
    },
  );
  return parseJson<{ items: ProjectThreadLink[] }>(response);
}

export async function setPrimaryProjectThread(projectId: string, threadId: string) {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/threads/${threadId}/set-primary`,
    {
      method: "POST",
    },
  );
  return parseJson<ProjectThreadLink>(response);
}

export async function importProjectThreadSnapshot(
  projectId: string,
  threadId: string,
  input: {
    source_thread_id: string;
  },
) {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/threads/${threadId}/imports`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  return parseJson<Record<string, unknown>>(response);
}

export async function listProjectPlans(projectId: string): Promise<{ items: ExecutionPlan[] }> {
  const response = await fetch(`${projectsBaseUrl()}/${projectId}/plans`, {
    cache: "no-store",
  });
  return parseJson<{ items: ExecutionPlan[] }>(response);
}

export async function createProjectPlan(
  projectId: string,
  input: {
    phase?: string;
    title: string;
    description?: string;
    execution_mode?: "manual" | "auto";
    is_gate_plan?: boolean;
    is_primary?: boolean;
  },
) {
  const response = await fetch(`${projectsBaseUrl()}/${projectId}/plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return parseJson<ExecutionPlan>(response);
}

export async function setPrimaryProjectPlan(projectId: string, planId: string) {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/plans/${planId}/set-primary`,
    {
      method: "POST",
    },
  );
  return parseJson<ExecutionPlan>(response);
}

export async function startProjectPlan(projectId: string, planId: string) {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/plans/${planId}/start`,
    {
      method: "POST",
    },
  );
  return parseJson<ExecutionPlan>(response);
}

export async function createReworkPlan(
  projectId: string,
  planId: string,
  input: {
    title: string;
    description?: string;
    execution_mode?: "manual" | "auto";
  },
) {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/plans/${planId}/create-rework`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  return parseJson<ExecutionPlan>(response);
}

export async function confirmProjectPlanOutcome(
  projectId: string,
  planId: string,
  input: {
    outcome_status: string;
    outcome_summary?: string;
    selected_next_plan_id?: string | null;
  },
) {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/plans/${planId}/confirm-outcome`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  return parseJson<ExecutionPlan>(response);
}

export async function listProjectDecisions(projectId: string): Promise<{
  items: ProjectDecisionRequest[];
}> {
  const response = await fetch(`${projectsBaseUrl()}/${projectId}/decisions`, {
    cache: "no-store",
  });
  return parseJson<{ items: ProjectDecisionRequest[] }>(response);
}

export async function resolveProjectDecision(
  projectId: string,
  decisionId: string,
  input: {
    action_id: string;
    payload?: Record<string, unknown>;
  },
) {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/decisions/${decisionId}/resolve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  return parseJson<ProjectDecisionRequest>(response);
}

export async function listProjectTimeline(projectId: string): Promise<{
  items: ProjectTimelineEvent[];
  next_cursor: string | null;
}> {
  const response = await fetch(`${projectsBaseUrl()}/${projectId}/timeline`, {
    cache: "no-store",
  });
  return parseJson<{ items: ProjectTimelineEvent[]; next_cursor: string | null }>(response);
}

export async function listProjectArtifacts(projectId: string): Promise<{
  items: ManagedArtifact[];
}> {
  const response = await fetch(`${projectsBaseUrl()}/${projectId}/artifacts`, {
    cache: "no-store",
  });
  return parseJson<{ items: ManagedArtifact[] }>(response);
}

export async function getProjectArtifact(
  projectId: string,
  artifactId: string,
): Promise<ProjectArtifactDetail> {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/artifacts/${artifactId}`,
    {
      cache: "no-store",
    },
  );
  return parseJson<ProjectArtifactDetail>(response);
}

export async function restoreProjectArtifact(
  projectId: string,
  artifactId: string,
  input: {
    version_id: string;
    restore_reason?: string;
  },
) {
  const response = await fetch(
    `${projectsBaseUrl()}/${projectId}/artifacts/${artifactId}/restore`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  return parseJson<ProjectArtifactDetail["versions"][number]>(response);
}
