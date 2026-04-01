"use client";

import { useEffect, useMemo, useState } from "react";

import { splitJobsByKind } from "@/core/automation/presentation";
import type {
  AutomationJob,
  AutomationJobCreateInput,
  AutomationRun,
  AutomationStatus,
} from "@/core/automation/types";

import { AutomationCreatePanel } from "./automation-create-panel";
import { AutomationListPanel } from "./automation-list-panel";
import { AutomationResultsPanel } from "./automation-results-panel";

type AutomationConsoleProps = {
  jobs: AutomationJob[];
  runs: AutomationRun[];
  status: AutomationStatus;
  createPending: boolean;
  onCreate: (input: AutomationJobCreateInput) => Promise<unknown>;
  onPause: (jobId: string) => Promise<unknown>;
  onResume: (jobId: string) => Promise<unknown>;
  onRun: (jobId: string) => Promise<unknown>;
  onRemove: (jobId: string) => Promise<unknown>;
  initialJobId?: string | null;
  initialRunId?: string | null;
};

export function AutomationConsole({
  jobs,
  runs,
  status,
  createPending,
  onCreate,
  onPause,
  onResume,
  onRun,
  onRemove,
  initialJobId,
  initialRunId,
}: AutomationConsoleProps) {
  const groupedJobs = splitJobsByKind(jobs);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRunId ?? null);

  const preferredJobId = useMemo(
    () => resolvePreferredJobId(jobs, runs, initialJobId, initialRunId),
    [initialJobId, initialRunId, jobs, runs],
  );

  useEffect(() => {
    if (!jobs.length) {
      setSelectedJobId(null);
      return;
    }

    setSelectedJobId((current) => {
      if (current && jobs.some((job) => job.id === current)) {
        return current;
      }
      return preferredJobId;
    });
  }, [jobs, preferredJobId]);

  useEffect(() => {
    const nextRuns = runs.filter((run) => run.job_id === selectedJobId);
    setSelectedRunId((current) => {
      if (current && nextRuns.some((run) => run.id === current)) {
        return current;
      }
      return initialRunId && nextRuns.some((run) => run.id === initialRunId)
        ? initialRunId
        : (nextRuns[0]?.id ?? null);
    });
  }, [initialRunId, runs, selectedJobId]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;

  return (
    <div className="space-y-6">
      <AutomationCreatePanel
        jobs={jobs}
        runs={runs}
        status={status}
        isPending={createPending}
        onCreate={onCreate}
      />
      <AutomationListPanel
        reminders={groupedJobs.reminders}
        tasks={groupedJobs.tasks}
        selectedJobId={selectedJobId}
        onSelectJob={setSelectedJobId}
        onPause={onPause}
        onResume={onResume}
        onRun={onRun}
        onRemove={onRemove}
      />
      <AutomationResultsPanel
        selectedJob={selectedJob}
        runs={runs}
        selectedRunId={selectedRunId}
        onSelectRun={setSelectedRunId}
      />
    </div>
  );
}

function resolvePreferredJobId(
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
