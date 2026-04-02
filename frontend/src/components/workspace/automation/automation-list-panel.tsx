"use client";

import type { AutomationJob } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

import { AutomationJobSection } from "./automation-job-section";

type AutomationListPanelProps = {
  reminders: AutomationJob[];
  tasks: AutomationJob[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onPause: (jobId: string) => Promise<unknown>;
  onResume: (jobId: string) => Promise<unknown>;
  onRun: (jobId: string) => Promise<unknown>;
  onRemove: (jobId: string) => Promise<unknown>;
};

export function AutomationListPanel({
  reminders,
  tasks,
  selectedJobId,
  onSelectJob,
  onPause,
  onResume,
  onRun,
  onRemove,
}: AutomationListPanelProps) {
  const { t } = useI18n();
  const copy = t.settings.automationWorkspace.sections;

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <AutomationJobSection
        title={copy.remindersTitle}
        description={copy.remindersDescription}
        emptyMessage={copy.emptyReminders}
        jobs={reminders}
        selectedJobId={selectedJobId}
        onSelect={onSelectJob}
        onPause={onPause}
        onResume={onResume}
        onRun={onRun}
        onRemove={onRemove}
      />
      <AutomationJobSection
        title={copy.tasksTitle}
        description={copy.tasksDescription}
        emptyMessage={copy.emptyTasks}
        jobs={tasks}
        selectedJobId={selectedJobId}
        onSelect={onSelectJob}
        onPause={onPause}
        onResume={onResume}
        onRun={onRun}
        onRemove={onRemove}
      />
    </section>
  );
}
