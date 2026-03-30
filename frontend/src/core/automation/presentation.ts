import type { AutomationJob, AutomationRun, AutomationStatus } from "./types";

type AutomationOverviewInput = {
  jobs?: AutomationJob[];
  status: AutomationStatus;
  runs: AutomationRun[];
};

type AutomationOverviewCardTone = "default" | "warning";

type ScheduleLabelCopy = {
  dailyPrefix: string;
  weekdaysPrefix: string;
  weeklyPrefix: string;
  oncePrefix: string;
  everyMinutesTemplate: string;
  eventPrefix: string;
};

export function splitJobsByKind(jobs: AutomationJob[]) {
  return {
    reminders: jobs.filter((job) => job.job_kind === "reminder"),
    tasks: jobs.filter((job) => job.job_kind === "scheduled_task"),
    events: jobs.filter((job) => job.job_kind === "event_task"),
  };
}

export function formatScheduleLabel(
  job: AutomationJob,
  copy: ScheduleLabelCopy = {
    dailyPrefix: "Daily at",
    weekdaysPrefix: "Weekdays at",
    weeklyPrefix: "Weekly at",
    oncePrefix: "Once at",
    everyMinutesTemplate: "Every {minutes} min",
    eventPrefix: "On",
  },
) {
  const timeOfDay = readString(job.schedule_metadata.time_of_day);
  const runAt = readString(job.schedule_metadata.run_at) ?? readString(job.schedule_value);
  const weekdays = readNumberArray(job.schedule_metadata.weekdays);
  const eventName = readKnownString(job.trigger_spec ?? {}, "event_name");

  if (job.schedule_preset === "event" && eventName) {
    return `${copy.eventPrefix} ${eventName}`;
  }

  if (job.schedule_preset === "daily" && timeOfDay) {
    return `${copy.dailyPrefix} ${timeOfDay}`;
  }
  if (job.schedule_preset === "weekdays" && timeOfDay) {
    return `${copy.weekdaysPrefix} ${timeOfDay}`;
  }
  if (job.schedule_preset === "weekly" && timeOfDay) {
    const weekdayText = weekdays ? formatWeekdayList(weekdays) : null;
    return weekdayText
      ? `${copy.weeklyPrefix} ${weekdayText} ${timeOfDay}`
      : `${copy.weeklyPrefix} ${timeOfDay}`;
  }
  if (job.schedule_preset === "once" && runAt) {
    return `${copy.oncePrefix} ${formatDateTime(runAt)}`;
  }
  if (job.schedule_preset === "interval") {
    const everyMinutes = Number.parseInt(job.schedule_value, 10) / 60;
    return Number.isFinite(everyMinutes) && everyMinutes > 0
      ? copy.everyMinutesTemplate.replace("{minutes}", String(everyMinutes))
      : job.schedule_value;
  }
  return job.schedule_value;
}

export function formatActionLabel(job: AutomationJob) {
  if (job.action_kind === "script") {
    const entrypoint = readKnownString(job.action_spec, "entrypoint");
    return entrypoint ? `Script: ${entrypoint}` : "Script";
  }
  if (job.action_kind === "agent_prompt") {
    return "Agent prompt";
  }
  return job.action_kind;
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
  const nextJob = pickNextJob(input.jobs ?? []);

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
    nextJob,
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

function readKnownString(record: Record<string, unknown>, key: string) {
  return readString(record[key]);
}

function pickNextJob(jobs: AutomationJob[]) {
  const nextJobs = jobs
    .filter((job) => typeof job.next_run_at === "string" && job.next_run_at)
    .map((job) => ({
      id: job.id,
      name: job.name,
      nextRunAt: job.next_run_at!,
      timestamp: Date.parse(job.next_run_at!),
    }))
    .filter((job) => Number.isFinite(job.timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);

  const first = nextJobs[0];
  if (!first) {
    return null;
  }

  return {
    id: first.id,
    name: first.name,
    nextRunAt: first.nextRunAt,
  };
}

function readNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }
  const numbers = value.filter(
    (item): item is number => Number.isInteger(item) && item >= 0 && item <= 6,
  );
  return numbers.length > 0 ? numbers : null;
}

function formatWeekdayList(weekdays: number[]) {
  const labels = weekdays
    .map((weekday) => WEEKDAY_LABELS[weekday])
    .filter(Boolean);
  return labels.join(", ");
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
