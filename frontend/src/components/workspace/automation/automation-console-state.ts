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
  const latestSucceeded = pickLatestAutomationRun(
    runs.filter((run) => run.status === "succeeded"),
  );
  if (latestSucceeded) {
    return latestSucceeded.id;
  }
  return pickLatestAutomationRun(runs)?.id ?? null;
}

function pickLatestAutomationRun(runs: AutomationRun[]) {
  return runs.reduce<AutomationRun | null>((latest, candidate) => {
    if (!latest) {
      return candidate;
    }

    return timestampOfRun(candidate) > timestampOfRun(latest) ? candidate : latest;
  }, null);
}

function timestampOfRun(run: AutomationRun) {
  const primary = Date.parse(run.finished_at ?? run.started_at);
  if (Number.isFinite(primary)) {
    return primary;
  }

  const fallback = Date.parse(run.started_at);
  if (Number.isFinite(fallback)) {
    return fallback;
  }

  return Number.NEGATIVE_INFINITY;
}
