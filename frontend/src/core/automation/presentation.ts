import type { AutomationJob, AutomationRun, AutomationStatus } from "./types";

type AutomationOverviewInput = {
  status: AutomationStatus;
  runs: AutomationRun[];
};

type AutomationOverviewCardTone = "default" | "warning";

export function splitJobsByKind(jobs: AutomationJob[]) {
  return {
    reminders: jobs.filter((job) => job.job_kind === "reminder"),
    tasks: jobs.filter((job) => job.job_kind === "scheduled_task"),
  };
}

export function formatScheduleLabel(job: AutomationJob) {
  const timeOfDay = readString(job.schedule_metadata.time_of_day);

  if (job.schedule_preset === "daily" && timeOfDay) {
    return `Daily at ${timeOfDay}`;
  }
  if (job.schedule_preset === "weekdays" && timeOfDay) {
    return `Weekdays at ${timeOfDay}`;
  }
  if (job.schedule_preset === "weekly" && timeOfDay) {
    return `Weekly at ${timeOfDay}`;
  }
  if (job.schedule_preset === "once") {
    return `Once at ${job.schedule_value}`;
  }
  if (job.schedule_preset === "interval") {
    const everyMinutes = Number.parseInt(job.schedule_value, 10) / 60;
    return Number.isFinite(everyMinutes) && everyMinutes > 0
      ? `Every ${everyMinutes} min`
      : job.schedule_value;
  }
  return job.schedule_value;
}

export function summarizeHistory(runs: AutomationRun[]) {
  return {
    totalRuns: runs.length,
    failedRuns: runs.filter((run) => run.status === "failed").length,
    succeededRuns: runs.filter((run) => run.status === "succeeded").length,
    latestRun: runs[0] ?? null,
  };
}

export function summarizeOverview(input: AutomationOverviewInput) {
  return {
    cards: [
      makeCard("active", input.status.active_jobs_count, "default"),
      makeCard("runs", input.status.run_count, "default"),
      makeCard(
        "attention",
        input.status.error_jobs_count + input.status.failed_runs_count,
        "warning",
      ),
    ],
    lastSuccessAt: input.status.last_success_at ?? null,
    latestRun: input.runs[0] ?? null,
  };
}

function makeCard(id: string, value: number, tone: AutomationOverviewCardTone) {
  return {
    id,
    value: String(value),
    tone,
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
