"use client";

import { Tabs, TabsContent } from "@/components/ui/tabs";
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

import { AutomationHistorySection } from "./automation-history-section";
import { AutomationJobSection } from "./automation-job-section";
import { AutomationKindTabs } from "./automation-kind-tabs";
import { AutomationOverviewCards } from "./automation-overview-cards";
import { ReminderForm } from "./reminder-form";
import { ScheduledTaskForm } from "./scheduled-task-form";

export function AutomationPage() {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace;
  const { jobs, isLoading: jobsLoading, error: jobsError } = useAutomationJobs();
  const { runs, isLoading: runsLoading, error: runsError } = useAutomationRuns();
  const { status } = useAutomationStatus();
  const createJob = useCreateAutomationJob();
  const pauseJob = usePauseAutomationJob();
  const resumeJob = useResumeAutomationJob();
  const runJob = useRunAutomationJob();
  const removeJob = useRemoveAutomationJob();
  const groupedJobs = splitJobsByKind(jobs);
  const firstError = jobsError ?? runsError ?? createJob.error;

  async function handleCreate(input: Parameters<typeof createJob.mutateAsync>[0]) {
    await createJob.mutateAsync(input);
  }

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

      <Tabs defaultValue="overview" className="gap-5">
        <AutomationKindTabs />

        <TabsContent value="overview" className="space-y-6">
          <AutomationOverviewCards status={resolvedStatus} runs={runs} />
          <AutomationHistorySection runs={runs.slice(0, 5)} />
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <ReminderForm
            isPending={createJob.isPending}
            onSubmit={handleCreate}
          />
          <AutomationJobSection
            title={copy.sections.remindersTitle}
            description={copy.sections.remindersDescription}
            emptyMessage={copy.sections.emptyReminders}
            jobs={groupedJobs.reminders}
            onPause={(jobId) => pauseJob.mutateAsync(jobId)}
            onResume={(jobId) => resumeJob.mutateAsync(jobId)}
            onRun={(jobId) => runJob.mutateAsync(jobId)}
            onRemove={(jobId) => removeJob.mutateAsync(jobId)}
          />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <ScheduledTaskForm
            isPending={createJob.isPending}
            onSubmit={handleCreate}
          />
          <AutomationJobSection
            title={copy.sections.tasksTitle}
            description={copy.sections.tasksDescription}
            emptyMessage={copy.sections.emptyTasks}
            jobs={groupedJobs.tasks}
            onPause={(jobId) => pauseJob.mutateAsync(jobId)}
            onResume={(jobId) => resumeJob.mutateAsync(jobId)}
            onRun={(jobId) => runJob.mutateAsync(jobId)}
            onRemove={(jobId) => removeJob.mutateAsync(jobId)}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {jobsLoading || runsLoading ? (
            <div className="text-muted-foreground text-sm">{t.common.loading}</div>
          ) : (
            <AutomationHistorySection runs={runs} />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
