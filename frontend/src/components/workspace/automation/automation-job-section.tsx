"use client";

import { PauseIcon, PlayIcon, Trash2Icon, ZapIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import { formatScheduleLabel } from "@/core/automation/presentation";
import type { AutomationJob } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type AutomationJobSectionProps = {
  title: string;
  description: string;
  emptyMessage: string;
  jobs: AutomationJob[];
  selectedJobId?: string | null;
  onSelect?: (jobId: string) => void;
  onPause: (jobId: string) => Promise<unknown>;
  onResume: (jobId: string) => Promise<unknown>;
  onRun: (jobId: string) => Promise<unknown>;
  onRemove: (jobId: string) => Promise<unknown>;
};

export function AutomationJobSection({
  title,
  description,
  emptyMessage,
  jobs,
  selectedJobId,
  onSelect,
  onPause,
  onResume,
  onRun,
  onRemove,
}: AutomationJobSectionProps) {
  const { t } = useI18n();
  const copy = t.settings.automation;
  const workspaceCopy = t.settings.automationWorkspace.sections;
  const scheduleLabelCopy = {
    dailyPrefix: workspaceCopy.dailyPrefix,
    weekdaysPrefix: workspaceCopy.weekdaysPrefix,
    weeklyPrefix: workspaceCopy.weeklyPrefix,
    oncePrefix: workspaceCopy.oncePrefix,
    everyMinutesTemplate: workspaceCopy.everyMinutesTemplate,
    eventPrefix: workspaceCopy.eventPrefix,
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {jobs.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <ItemGroup className="gap-3">
          {jobs.map((job) => (
            <Item
              key={job.id}
              variant="outline"
              className={
                job.id === selectedJobId
                  ? "items-start gap-4 rounded-xl border-primary/60 bg-primary/5"
                  : "items-start gap-4 rounded-xl"
              }
              onClick={() => onSelect?.(job.id)}
            >
              <ItemContent className="w-full">
                <ItemHeader className="items-start">
                  <div className="space-y-2">
                    <ItemTitle>
                      <span>{job.name}</span>
                      <Badge variant="secondary">
                        {copy.stateLabels[job.state] ?? job.state}
                      </Badge>
                      {job.owner_type === "agent" ? (
                        <Badge variant="outline">Agent</Badge>
                      ) : null}
                    </ItemTitle>
                    <ItemDescription>
                      {job.next_run_at
                        ? `${workspaceCopy.nextRunLabel}: ${job.next_run_at}`
                        : `${workspaceCopy.nextRunLabel}: ${workspaceCopy.notScheduled}`}
                    </ItemDescription>
                  </div>
                  <ItemActions className="flex-wrap justify-end">
                    {job.state === "paused" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void onResume(job.id)}
                      >
                        <PlayIcon className="size-4" />
                        {copy.resume}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void onPause(job.id)}
                      >
                        <PauseIcon className="size-4" />
                        {copy.pause}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void onRun(job.id)}
                    >
                      <ZapIcon className="size-4" />
                      {copy.runNow}
                    </Button>
                    {job.owner_type === "agent" && job.mutability === "pause_only" ? null : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void onRemove(job.id)}
                      >
                        <Trash2Icon className="size-4" />
                        {copy.remove}
                      </Button>
                    )}
                  </ItemActions>
                </ItemHeader>
                <div className="text-muted-foreground grid gap-3 pt-3 text-xs md:grid-cols-3">
                  <div>
                    <div className="font-medium text-foreground/80">
                      {workspaceCopy.scheduleLabel}
                    </div>
                    <div>{formatScheduleLabel(job, scheduleLabelCopy)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/80">
                      {workspaceCopy.summaryLabel}
                    </div>
                    <div>{job.prompt}</div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground/80">
                      {workspaceCopy.lastResultLabel}
                    </div>
                    <div>
                      {job.last_result_summary ?? workspaceCopy.noSummary}
                    </div>
                  </div>
                </div>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      )}
    </section>
  );
}
