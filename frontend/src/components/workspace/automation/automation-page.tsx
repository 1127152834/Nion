"use client";

import { useSearchParams } from "next/navigation";

import {
  useAutomationJobs,
  useAutomationRuns,
  useAutomationStatus,
  useCreateAutomationJob,
  usePauseAutomationJob,
  useRemoveAutomationJob,
  useResumeAutomationJob,
  useRunAutomationJob,
} from "@/core/automation/hooks";
import { splitJobsByKind } from "@/core/automation/presentation";
import { useI18n } from "@/core/i18n/hooks";

import { AutomationConsole } from "./automation-console";

export function AutomationPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const copy = t.settings.automationWorkspace;
  const { jobs, error: jobsError } = useAutomationJobs();
  const { runs, error: runsError } = useAutomationRuns();
  const { status } = useAutomationStatus();
  const createJob = useCreateAutomationJob();
  const pauseJob = usePauseAutomationJob();
  const resumeJob = useResumeAutomationJob();
  const runJob = useRunAutomationJob();
  const removeJob = useRemoveAutomationJob();
  const groupedJobs = splitJobsByKind(jobs);
  const firstError =
    jobsError ??
    runsError ??
    createJob.error ??
    pauseJob.error ??
    resumeJob.error ??
    runJob.error ??
    removeJob.error;
  const highlightedRunId = searchParams.get("run");

  const resolvedStatus = status ?? {
    scheduler_running: false,
    total_jobs_count: jobs.length,
    active_jobs_count: groupedJobs.reminders.length + groupedJobs.tasks.length,
    paused_jobs_count: 0,
    error_jobs_count: 0,
    run_count: runs.length,
    failed_runs_count: runs.filter((run) => run.status === "failed").length,
    last_tick_at: null,
    last_success_at: null,
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="text-2xl font-semibold tracking-tight">{copy.title}</div>
        <p className="text-muted-foreground max-w-3xl text-sm">
          {copy.description}
        </p>
      </header>

      {firstError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
          {firstError instanceof Error ? firstError.message : String(firstError)}
        </div>
      ) : null}

      <AutomationConsole
        jobs={jobs}
        runs={runs}
        status={resolvedStatus}
        createPending={createJob.isPending}
        onCreate={(input) => createJob.mutateAsync(input)}
        onPause={(jobId) => pauseJob.mutateAsync(jobId)}
        onResume={(jobId) => resumeJob.mutateAsync(jobId)}
        onRun={(jobId) => runJob.mutateAsync(jobId)}
        onRemove={(jobId) => removeJob.mutateAsync(jobId)}
        initialJobId={searchParams.get("job")}
        initialRunId={highlightedRunId}
      />
    </section>
  );
}
