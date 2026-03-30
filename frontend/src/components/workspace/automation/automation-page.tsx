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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-5">
        <AutomationKindTabs />

        <TabsContent value="overview" className="space-y-6">
          <AutomationOverviewCards status={resolvedStatus} runs={runs} />
          <AutomationHistorySection runs={runs.slice(0, 5)} highlightedRunId={highlightedRunId} />
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <AutomationCreator
            isPending={createJob.isPending}
            defaultKind="reminder"
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
          <AutomationCreator
            isPending={createJob.isPending}
            defaultKind="scheduled_task"
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
