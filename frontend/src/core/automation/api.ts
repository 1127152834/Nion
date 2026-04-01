import { getBackendBaseURL } from "../config/index.js";

import type {
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

function getAutomationFallbackBaseURL(primaryBaseURL: string) {
  if (primaryBaseURL.startsWith("http://127.0.0.1:43115")) {
    return primaryBaseURL.replace("http://127.0.0.1:43115", "http://localhost:8001");
  }
  return null;
}

async function fetchAutomation(
  path: string,
  init?: RequestInit,
) {
  const baseURL = getBackendBaseURL();
  const primaryURL = `${baseURL}${path}`;

  try {
    return await fetch(primaryURL, init);
  } catch (error) {
    const fallbackBaseURL = getAutomationFallbackBaseURL(baseURL);
    if (!fallbackBaseURL) {
      throw error;
    }
    return await fetch(`${fallbackBaseURL}${path}`, init);
  }
}

export async function loadAutomationJobs() {
  const response = await fetchAutomation("/api/automation/jobs");
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation jobs (${response.status})`));
  }
  const json = (await response.json()) as { jobs: AutomationJob[] };
  return json.jobs;
}

export async function loadAutomationJob(jobId: string) {
  const response = await fetchAutomation(`/api/automation/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation job (${response.status})`));
  }
  const json = (await response.json()) as { job: AutomationJob };
  return json.job;
}

export async function createAutomationJob(input: AutomationJobCreateInput) {
  const response = await fetchAutomation("/api/automation/jobs", {
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
  input: Partial<AutomationJobCreateInput>,
) {
  const response = await fetchAutomation(`/api/automation/jobs/${jobId}`, {
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

export async function pauseAutomationJob(jobId: string) {
  return postAutomationJobAction(jobId, "pause");
}

export async function resumeAutomationJob(jobId: string) {
  return postAutomationJobAction(jobId, "resume");
}

export async function runAutomationJob(jobId: string) {
  const response = await fetchAutomation(
    `/api/automation/jobs/${jobId}/run`,
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
  const response = await fetchAutomation(
    `/api/automation/jobs/${jobId}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to remove automation job (${response.status})`));
  }
}

export async function loadAutomationRuns() {
  const response = await fetchAutomation("/api/automation/runs");
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation runs (${response.status})`));
  }
  const json = (await response.json()) as { runs: AutomationRun[] };
  return json.runs;
}

export async function loadAutomationStatus() {
  const response = await fetchAutomation("/api/automation/status");
  if (!response.ok) {
    throw new Error(resolveErrorMessage(await response.text(), `Failed to load automation status (${response.status})`));
  }
  return (await response.json()) as AutomationStatus;
}

async function postAutomationJobAction(jobId: string, action: "pause" | "resume") {
  const response = await fetchAutomation(
    `/api/automation/jobs/${jobId}/${action}`,
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
