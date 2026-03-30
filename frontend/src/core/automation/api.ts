import { getBackendBaseURL } from "../config/index.js";

import type {
  AutomationEvent,
  AutomationJob,
  AutomationJobCreateInput,
  AutomationRun,
  AutomationStatus,
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
