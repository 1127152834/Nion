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
};

export type AutomationJobDescription = {
  id: string;
  title: string;
  summary: string;
  scheduleLabel: string;
  nextRunAt: string | null;
  lastResultSummary: string | null;
};

export type AutomationOwnershipDescription = {
  ownerLabel: string;
  mutabilityLabel: string;
  reason: string;
  provenanceMemoryId: string | null;
  provenanceLearningId: string | null;
};

export type AutomationRunPreview = {
  runId: string;
  jobId: string;
  jobName: string;
  status: AutomationRun["status"];
  summary: string;
  startedAt: string;
  finishedAt: string | null;
  threadId: string | null;
};

export type AutomationThreadPreviewMessage = {
  type: "human" | "ai" | "tool" | "tool_activity_summary";
  text: string;
};

export type AutomationThreadPreview = {
  title: string;
  threadId: string;
  updatedAt: string | null;
  messages: AutomationThreadPreviewMessage[];
};

export function splitJobsByKind(jobs: AutomationJob[]) {
  return {
    reminders: jobs.filter((job) => job.job_kind === "reminder"),
    tasks: jobs.filter((job) => job.job_kind === "scheduled_task"),
  };
}

export function splitJobsByOwner(jobs: AutomationJob[]) {
  return {
    userOwned: jobs.filter((job) => job.owner_type === "user"),
    agentOwned: jobs.filter((job) => job.owner_type === "agent"),
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
  },
) {
  const timeOfDay = readString(job.schedule_metadata.time_of_day);
  const runAt = readString(job.schedule_metadata.run_at) ?? readString(job.schedule_value);
  const weekdays = readNumberArray(job.schedule_metadata.weekdays);

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

export function formatActionLabel(_job: AutomationJob) {
  return "Agent prompt";
}

export function describeAutomationJob(job: AutomationJob): AutomationJobDescription {
  return {
    id: job.id,
    title: deriveAutomationJobTitle(job),
    summary: job.prompt.trim(),
    scheduleLabel: formatScheduleLabel(job),
    nextRunAt: readString(job.next_run_at) ?? null,
    lastResultSummary: readString(job.last_result_summary) ?? null,
  };
}

export function describeAutomationOwnership(
  job: Pick<
    AutomationJob,
    "owner_type" | "mutability" | "provenance_memory_id" | "provenance_learning_id"
  >,
): AutomationOwnershipDescription {
  const provenanceMemoryId = readString(job.provenance_memory_id) ?? null;
  const provenanceLearningId = readString(job.provenance_learning_id) ?? null;

  if (job.owner_type === "agent") {
    const parts: string[] = [];
    if (provenanceLearningId) {
      parts.push(`来源学习主题 ${provenanceLearningId}`);
    }
    if (provenanceMemoryId) {
      parts.push(`来源记忆 ${provenanceMemoryId}`);
    }

    return {
      ownerLabel: "Agent 创建",
      mutabilityLabel:
        job.mutability === "pause_only" ? "仅允许暂停或恢复" : "允许直接编辑",
      reason:
        parts.length > 0
          ? `这是一个由 Agent 主动生成的自动化任务，${parts.join("，")}，用于把反复出现的需求转成持续动作。`
          : "这是一个由 Agent 主动生成的自动化任务，用于把反复出现的需求转成持续动作。",
      provenanceMemoryId,
      provenanceLearningId,
    };
  }

  return {
    ownerLabel: "用户创建",
    mutabilityLabel: "允许直接编辑",
    reason: "这是你手动创建的自动化任务，可以直接修改计划、提示词和调度方式。",
    provenanceMemoryId,
    provenanceLearningId,
  };
}

export function deriveAutomationJobTitle(job: Pick<AutomationJob, "name" | "prompt" | "id">) {
  const name = readString(job.name);
  if (name && !GENERIC_AUTOMATION_NAMES.has(name.toLowerCase())) {
    return name;
  }

  const prompt = readString(job.prompt);
  if (!prompt) {
    return job.id;
  }

  const firstSentence = prompt
    .split(/(?<=[.!?。！？])\s+/u, 1)[0]
    ?.trim();
  if (firstSentence) {
    return firstSentence;
  }

  return prompt;
}

export function buildAutomationRunPreview(input: {
  job: AutomationJob;
  run: AutomationRun;
}): AutomationRunPreview {
  return {
    runId: input.run.id,
    jobId: input.job.id,
    jobName: input.job.name.trim() || input.job.id,
    status: input.run.status,
    summary: input.run.result_summary.trim(),
    startedAt: input.run.started_at,
    finishedAt: input.run.finished_at ?? null,
    threadId: readString(input.run.isolated_thread_id) ?? null,
  };
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
const GENERIC_AUTOMATION_NAMES = new Set([
  "reminder",
  "scheduled task",
  "automation",
  "提醒事项",
  "定时任务",
  "自动化",
]);
