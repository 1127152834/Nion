import { getBackendBaseURL } from "../config/index.js";

import type {
  AutomationApproval,
  AutomationAuditEvent,
  AutomationEvent,
  AutomationJob,
  AutomationJobCreateInput,
  AutomationPlatformCapabilities,
  AutomationPlatformConnector,
  AutomationRun,
  AutomationStatus,
  AutomationTemplate,
} from "./types";

function resolveErrorMessage(rawText: string, fallback: string): string {
  const text = rawText.trim();
  if (!text) {
    return fallback;
  }
  try {
    const payload = JSON.parse(text) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  } catch {
    // keep raw text
  }
  return text;
}

export async function loadAutomationJobs() {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/jobs`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation jobs (${response.status})`));
  }
  const json = (await response.json()) as { jobs: AutomationJob[] };
  return json.jobs;
}

export async function loadAutomationJob(jobId: string) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation job (${response.status})`));
  }
  const json = (await response.json()) as { job: AutomationJob };
  return json.job;
}

export async function loadAutomationApprovals() {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/approvals`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation approvals (${response.status})`));
  }
  const json = (await response.json()) as { approvals: AutomationApproval[] };
  return json.approvals;
}

export async function requestAutomationApproval(jobId: string, input: { actor_id: string; reason: string }) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/jobs/${jobId}/approvals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to request automation approval (${response.status})`));
  }
  const json = (await response.json()) as { approval: AutomationApproval };
  return json.approval;
}

export async function decideAutomationApproval(approvalId: string, input: { actor_id: string; decision: string }) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/approvals/${approvalId}/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to decide automation approval (${response.status})`));
  }
  const json = (await response.json()) as { approval: AutomationApproval };
  return json.approval;
}

export async function loadAutomationAudit() {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/audit`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation audit (${response.status})`));
  }
  const json = (await response.json()) as { audit: AutomationAuditEvent[] };
  return json.audit;
}

export async function loadAutomationTemplates() {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/templates`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation templates (${response.status})`));
  }
  return (await response.json()) as {
    official: AutomationTemplate[];
    personal: AutomationTemplate[];
  };
}

export async function loadAutomationTemplate(templateId: string) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/templates/${templateId}`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation template (${response.status})`));
  }
  const json = (await response.json()) as { template: AutomationTemplate };
  return json.template;
}

export async function loadAutomationPlatformCapabilities() {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/platform/capabilities`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation platform capabilities (${response.status})`));
  }
  return (await response.json()) as AutomationPlatformCapabilities;
}

export async function loadAutomationPlatformConnectors() {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/platform/connectors`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation platform connectors (${response.status})`));
  }
  return (await response.json()) as {
    connectors: AutomationPlatformConnector[];
  };
}

export async function exportAutomationJobTemplate(jobId: string) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/jobs/${jobId}/export`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to export automation job (${response.status})`));
  }
  return (await response.json()) as {
    manifest: Record<string, unknown>;
    files: Record<string, string>;
  };
}

export async function createAutomationJob(input: AutomationJobCreateInput) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to create automation job (${response.status})`));
  }
  const json = (await response.json()) as { job: AutomationJob };
  return json.job;
}

export async function importAutomationTemplate(input: {
  manifest: Record<string, unknown>;
  files: Record<string, string>;
}) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/templates/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to import automation template (${response.status})`));
  }
  const json = (await response.json()) as { job: AutomationJob };
  return json.job;
}

export async function saveAutomationTemplate(input: {
  id: string;
  name: string;
  scope: string;
  manifest: Record<string, unknown>;
  files: Record<string, string>;
}) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to save automation template (${response.status})`));
  }
  return (await response.json()) as AutomationTemplate;
}

export async function activateAutomationTemplate(templateId: string) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/templates/${templateId}/activate`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to activate automation template (${response.status})`));
  }
  const json = (await response.json()) as { job: AutomationJob };
  return json.job;
}

export async function updateAutomationJob(
  jobId: string,
  input: Partial<AutomationJobCreateInput> & {
    delete_package_files?: string[];
  },
) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/jobs/${jobId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to update automation job (${response.status})`));
  }
  const json = (await response.json()) as { job: AutomationJob };
  return json.job;
}

export async function uploadAutomationPackageFiles(jobId: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  const response = await fetch(`${getBackendBaseURL()}/api/automation/jobs/${jobId}/package/files`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to upload package files (${response.status})`));
  }
  const json = (await response.json()) as { job: AutomationJob };
  return json.job;
}

export async function pauseAutomationJob(jobId: string) {
  return postAutomationJobAction(jobId, "pause");
}

export async function resumeAutomationJob(jobId: string) {
  return postAutomationJobAction(jobId, "resume");
}

export async function runAutomationJob(jobId: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/automation/jobs/${jobId}/run`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to run automation job (${response.status})`));
  }
  const json = (await response.json()) as { run: AutomationRun };
  return json.run;
}

export async function resumeWorkflowRun(jobId: string, runId: string, payload: Record<string, unknown>) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/automation/jobs/${jobId}/runs/${runId}/resume`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload }),
    },
  );
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to resume workflow run (${response.status})`));
  }
  const json = (await response.json()) as { run: AutomationRun };
  return json.run;
}

export async function removeAutomationJob(jobId: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/automation/jobs/${jobId}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to remove automation job (${response.status})`));
  }
}

export async function loadAutomationRuns() {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/runs`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation runs (${response.status})`));
  }
  const json = (await response.json()) as { runs: AutomationRun[] };
  return json.runs;
}

export async function loadAutomationStatus() {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/status`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation status (${response.status})`));
  }
  return (await response.json()) as AutomationStatus;
}

export async function loadAutomationEvents(filters?: {
  category?: string;
  eventType?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.category) {
    params.set("category", filters.category);
  }
  if (filters?.eventType) {
    params.set("event_type", filters.eventType);
  }
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const response = await fetch(`${getBackendBaseURL()}/api/automation/events${query}`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation events (${response.status})`));
  }
  const json = (await response.json()) as { events: AutomationEvent[] };
  return json.events;
}

export async function loadAutomationEvent(eventId: string) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/events/${eventId}`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation event (${response.status})`));
  }
  const json = (await response.json()) as { event: AutomationEvent };
  return json.event;
}

export async function replayAutomationEvent(eventName: string, payload: Record<string, unknown>) {
  const response = await fetch(`${getBackendBaseURL()}/api/automation/events/replay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event_name: eventName,
      payload,
    }),
  });
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to replay automation event (${response.status})`));
  }
  return (await response.json()) as { ok: boolean };
}

async function postAutomationJobAction(jobId: string, action: "pause" | "resume") {
  const response = await fetch(
    `${getBackendBaseURL()}/api/automation/jobs/${jobId}/${action}`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to ${action} automation job (${response.status})`));
  }
  const json = (await response.json()) as { job: AutomationJob };
  return json.job;
}
