import assert from "node:assert/strict";
import test from "node:test";

import type { AutomationJob, AutomationRun, AutomationStatus } from "./types";

const { formatScheduleLabel, splitJobsByKind, summarizeHistory, summarizeOverview } = await import(
  new URL("./presentation.ts", import.meta.url).href
);

function makeJob(overrides: Partial<AutomationJob>): AutomationJob {
  return {
    id: "job-1",
    name: "Morning reminder",
    prompt: "Review priorities",
    job_kind: "reminder",
    schedule_kind: "cron",
    schedule_value: "30 9 * * *",
    schedule_preset: "daily",
    schedule_timezone: "Asia/Shanghai",
    schedule_metadata: { time_of_day: "09:30" },
    enabled: true,
    state: "scheduled",
    delivery_mode: "local",
    delivery_targets: [],
    skills: [],
    session_policy: {},
    toolset_profile: "automation",
    created_at: "2026-03-24T00:00:00Z",
    updated_at: "2026-03-24T00:00:00Z",
    ...overrides,
  };
}

function makeRun(overrides: Partial<AutomationRun> = {}): AutomationRun {
  return {
    id: "run-1",
    job_id: "job-1",
    started_at: "2026-03-24T01:00:00Z",
    finished_at: "2026-03-24T01:01:00Z",
    status: "succeeded",
    result_summary: "Delivered summary",
    output_artifacts: [],
    delivery_results: [],
    ...overrides,
  };
}

void test("groups reminder jobs separately from scheduled tasks", () => {
  const result = splitJobsByKind([
    makeJob({ id: "job-1", job_kind: "reminder" }),
    makeJob({ id: "job-2", job_kind: "scheduled_task", name: "Weekly review" }),
  ]);

  assert.equal(result.reminders.length, 1);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0]?.name, "Weekly review");
});

void test("formats friendly schedule labels from presets and metadata", () => {
  assert.equal(
    formatScheduleLabel(makeJob({ schedule_preset: "daily", schedule_metadata: { time_of_day: "09:30" } })),
    "Daily at 09:30",
  );
  assert.equal(
    formatScheduleLabel(makeJob({ schedule_preset: "weekdays", schedule_metadata: { time_of_day: "18:00" } })),
    "Weekdays at 18:00",
  );
});

void test("summarizes overview metrics for dashboard cards", () => {
  const status: AutomationStatus = {
    scheduler_running: true,
    total_jobs_count: 6,
    active_jobs_count: 4,
    paused_jobs_count: 1,
    error_jobs_count: 1,
    run_count: 24,
    failed_runs_count: 2,
    last_tick_at: "2026-03-24T01:07:00Z",
    last_success_at: "2026-03-24T01:01:00Z",
  };

  const summary = summarizeOverview({ status, runs: [makeRun()] });

  assert.equal(summary.cards[0]?.value, "4");
  assert.equal(summary.cards[2]?.tone, "warning");
  assert.equal(summary.lastSuccessAt, "2026-03-24T01:01:00Z");
});

void test("summarizes history using the latest run and grouped counts", () => {
  const summary = summarizeHistory([
    makeRun({ id: "run-2", status: "failed", result_summary: "Timeout", started_at: "2026-03-24T02:00:00Z" }),
    makeRun({ id: "run-1", status: "succeeded", result_summary: "Delivered summary" }),
  ]);

  assert.equal(summary.totalRuns, 2);
  assert.equal(summary.failedRuns, 1);
  assert.equal(summary.latestRun?.id, "run-2");
});
