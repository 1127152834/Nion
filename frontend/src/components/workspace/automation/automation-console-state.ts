import type { AutomationJob, AutomationRun } from "@/core/automation/types";

export function resolvePreferredAutomationJobId(
  jobs: AutomationJob[],
  runs: AutomationRun[],
  initialJobId?: string | null,
  initialRunId?: string | null,
) {
  if (initialJobId && jobs.some((job) => job.id === initialJobId)) {
    return initialJobId;
  }

  if (initialRunId) {
    const matchedRun = runs.find((run) => run.id === initialRunId);
    if (matchedRun && jobs.some((job) => job.id === matchedRun.job_id)) {
      return matchedRun.job_id;
    }
  }

  return jobs[0]?.id ?? null;
}

export function pickDefaultAutomationRunId(runs: AutomationRun[]) {
  const latestSucceeded = runs.find((run) => run.status === "succeeded");
  if (latestSucceeded) {
    return latestSucceeded.id;
  }
  return runs[0]?.id ?? null;
}
