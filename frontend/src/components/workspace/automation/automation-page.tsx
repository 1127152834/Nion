"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { buildEventTaskDraftFromEvent } from "@/core/automation/event-presentation";
import { buildEventTaskRequest } from "@/core/automation/event-task-builder";
import {
  useAutomationEvents,
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
import { collectAutomationRuntimeEffects } from "@/core/automation/runtime-effects";
import type { AutomationActionKind, AutomationJobCreateInput } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";
import { useNotification } from "@/core/notification/hooks";

import { AutomationCreator } from "./automation-creator";
import { AutomationEventCenterSection } from "./automation-event-center-section";
import { AutomationHistorySection } from "./automation-history-section";
import { AutomationJobSection } from "./automation-job-section";
import { AutomationKindTabs } from "./automation-kind-tabs";
import { AutomationOverviewCards } from "./automation-overview-cards";
import { EventTaskDraftCard } from "./event-task-draft-card";
import { EventTaskForm } from "./event-task-form";

const AUTOMATION_TABS = new Set([
  "overview",
  "reminders",
  "tasks",
  "events",
  "eventCenter",
  "history",
]);

export function AutomationPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const copy = t.settings.automationWorkspace;
  const { showNotification } = useNotification();
  const { jobs, isLoading: jobsLoading, error: jobsError } = useAutomationJobs();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const { events } = useAutomationEvents({
    category: categoryFilter || undefined,
    eventType: eventTypeFilter || undefined,
  });
  const { runs, isLoading: runsLoading, error: runsError } = useAutomationRuns();
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
    runJob.error;
  const seenRunIdsRef = useRef<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState(resolveAutomationTab(searchParams.get("tab")));
  const highlightedRunId = searchParams.get("run");
  const [eventDraft, setEventDraft] = useState<{
    name: string;
    eventName: string;
    actionKind: AutomationActionKind;
    prompt: string;
  } | null>(null);
  const [eventTaskDraft, setEventTaskDraft] = useState<AutomationJobCreateInput | null>(null);

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

  useEffect(() => {
    setActiveTab(resolveAutomationTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    const effects = collectAutomationRuntimeEffects({
      jobs,
      runs,
      seenRunIds: seenRunIdsRef.current,
    });

    for (const effect of effects) {
      seenRunIdsRef.current.add(effect.runId);
      if (effect.kind === "notify") {
        showNotification(effect.title, { body: effect.body });
      } else if (effect.kind === "play_sound") {
        void playBrowserCue(effect.audioPath);
      }
    }
  }, [jobs, runs, showNotification]);

  return (
    <section className="space-y-8">
      <header className="relative overflow-hidden rounded-[34px] border border-stone-200/80 bg-[radial-gradient(circle_at_top_left,rgba(167,139,88,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(67,94,79,0.12),transparent_30%),linear-gradient(180deg,rgba(255,252,246,0.98),rgba(246,240,230,0.95))] px-7 py-7 shadow-[0_28px_90px_rgba(96,72,35,0.12)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),transparent_55%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-stone-200/80 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500 shadow-xs">
              {copy.hero.eyebrow}
            </div>
            <div className="space-y-3">
              <div className="text-4xl font-semibold tracking-tight text-stone-950">
                {copy.title}
              </div>
              <p className="max-w-3xl text-base leading-7 text-stone-600">
                {copy.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {copy.hero.quickActions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full border border-stone-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 shadow-xs transition hover:border-stone-300 hover:bg-white"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[24px] border border-stone-200/80 bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">
                {copy.hero.statusLabel}
              </div>
              <div className="mt-3 text-sm font-medium text-stone-800">
                {resolvedStatus.scheduler_running ? copy.overview.schedulerRunning : copy.overview.schedulerIdle}
              </div>
              <div className="mt-2 text-sm text-stone-500">
                {copy.overview.lastSuccess}: {resolvedStatus.last_success_at ?? copy.overview.notRecordedYet}
              </div>
            </div>
            <div className="rounded-[24px] border border-stone-200/80 bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">
                {copy.hero.nextLabel}
              </div>
              <div className="mt-3 text-sm font-medium text-stone-800">
                {jobs.find((job) => job.next_run_at)?.name ?? copy.hero.nonePlanned}
              </div>
              <div className="mt-2 text-sm text-stone-500">
                {jobs.find((job) => job.next_run_at)?.next_run_at ?? copy.sections.notScheduled}
              </div>
            </div>
            <div className="rounded-[24px] border border-stone-200/80 bg-white/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">
                {copy.hero.attentionLabel}
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-stone-900">
                {resolvedStatus.error_jobs_count + resolvedStatus.failed_runs_count}
              </div>
              <div className="mt-2 text-sm text-stone-500">
                {copy.hero.attentionHint}
              </div>
            </div>
          </div>
        </div>
      </header>

      {firstError ? (
        <div className="rounded-[24px] border border-red-300/50 bg-red-50/80 px-5 py-4 text-sm text-red-700 shadow-[0_10px_30px_rgba(185,74,74,0.08)]">
          {firstError instanceof Error ? firstError.message : String(firstError)}
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
        <div className="flex items-center justify-between gap-4">
          <AutomationKindTabs />
          <div className="hidden text-sm text-stone-500 xl:block">
            {copy.hero.surfaceHint}
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <AutomationCreator
              isPending={createJob.isPending}
              defaultKind="reminder"
              onSubmit={handleCreate}
            />
            <AutomationOverviewCards status={resolvedStatus} runs={runs} jobs={jobs} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
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
            <AutomationHistorySection runs={runs.slice(0, 5)} highlightedRunId={highlightedRunId} />
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <AutomationCreator
              isPending={createJob.isPending}
              defaultKind="reminder"
              onSubmit={handleCreate}
            />
            <AutomationOverviewCards status={resolvedStatus} runs={runs} jobs={groupedJobs.reminders} />
          </div>
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
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <AutomationCreator
              isPending={createJob.isPending}
              defaultKind="scheduled_task"
              onSubmit={handleCreate}
            />
            <AutomationOverviewCards status={resolvedStatus} runs={runs} jobs={groupedJobs.tasks} />
          </div>
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

        <TabsContent value="events" className="space-y-6">
          {eventTaskDraft ? <EventTaskDraftCard draft={eventTaskDraft} /> : null}
          <EventTaskForm
            isPending={createJob.isPending}
            onSubmit={handleCreate}
            presetDraft={eventDraft}
            quickTemplates={[
              {
                label: "Reply finished reminder",
                eventName: "agent.run.completed",
                actionKind: "notify",
                prompt: "Notify me when the assistant finishes a reply.",
              },
              {
                label: "Need my attention",
                eventName: "clarification.requested",
                actionKind: "notify",
                prompt: "Notify me when Nion needs clarification or my input.",
              },
              {
                label: "Automation failed alert",
                eventName: "automation.run.failed",
                actionKind: "notify",
                prompt: "Notify me when an automation run fails and needs attention.",
              },
            ]}
          />
          <AutomationJobSection
            title={copy.sections.eventsTitle}
            description={copy.sections.eventsDescription}
            emptyMessage={copy.sections.emptyEvents}
            jobs={groupedJobs.events}
            onPause={(jobId) => pauseJob.mutateAsync(jobId)}
            onResume={(jobId) => resumeJob.mutateAsync(jobId)}
            onRun={(jobId) => runJob.mutateAsync(jobId)}
            onRemove={(jobId) => removeJob.mutateAsync(jobId)}
          />
        </TabsContent>

        <TabsContent value="eventCenter" className="space-y-6">
          <AutomationEventCenterSection
            events={events}
            categoryFilter={categoryFilter}
            eventTypeFilter={eventTypeFilter}
            onCategoryFilterChange={setCategoryFilter}
            onEventTypeFilterChange={setEventTypeFilter}
            onCreateFromEvent={(event) => {
              const draft = buildEventTaskDraftFromEvent(event);
              setEventDraft(draft);
              setEventTaskDraft(
                buildEventTaskRequest({
                  name: draft.name,
                  prompt: draft.prompt,
                  eventName: draft.eventName,
                  actionKind: draft.actionKind,
                }),
              );
              setActiveTab("events");
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {jobsLoading || runsLoading ? (
            <div className="text-muted-foreground text-sm">{t.common.loading}</div>
          ) : (
            <AutomationHistorySection runs={runs} highlightedRunId={highlightedRunId} />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function resolveAutomationTab(value: string | null) {
  return value && AUTOMATION_TABS.has(value) ? value : "overview";
}

async function playBrowserCue(audioPath: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (audioPath) {
    try {
      const audio = new Audio(audioPath);
      await audio.play();
      return;
    } catch {
      // Fall back to synthesized tone below.
    }
  }
  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }
  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.03;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.12);
  oscillator.onended = () => {
    void context.close();
  };
}
