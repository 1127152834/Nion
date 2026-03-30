"use client";

import { PauseIcon, PlayIcon, Trash2Icon, ZapIcon } from "lucide-react";
import Link from "next/link";

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
import { formatActionLabel, formatScheduleLabel } from "@/core/automation/presentation";
import type { AutomationJob } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

type AutomationJobSectionProps = {
  title: string;
  description: string;
  emptyMessage: string;
  jobs: AutomationJob[];
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
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">{title}</h2>
        <p className="text-sm leading-6 text-stone-500">{description}</p>
      </div>
      {jobs.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-stone-200 bg-stone-50/70 p-6 text-sm text-stone-500">
          {emptyMessage}
        </div>
      ) : (
        <ItemGroup className="gap-4">
          {jobs.map((job) => (
            <Item
              key={job.id}
              variant="outline"
              className="items-start gap-4 rounded-[24px] border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(248,243,233,0.9))] p-1 shadow-[0_16px_40px_rgba(98,74,37,0.08)]"
            >
              <ItemContent className="w-full rounded-[20px] bg-white/75 p-4">
                <ItemHeader className="items-start">
                  <div className="space-y-2">
                    <ItemTitle className="flex flex-wrap items-center gap-2 text-stone-900">
                      <span>{job.name}</span>
                      <Badge variant="secondary" className="rounded-full bg-stone-900 text-white">
                        {copy.stateLabels[job.state] ?? job.state}
                      </Badge>
                    </ItemTitle>
                    <ItemDescription className="text-sm text-stone-500">
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
                        className="rounded-full border-stone-200 bg-white/80 text-stone-700 hover:bg-stone-100"
                        onClick={() => void onResume(job.id)}
                      >
                        <PlayIcon className="size-4" />
                        {copy.resume}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-stone-200 bg-white/80 text-stone-700 hover:bg-stone-100"
                        onClick={() => void onPause(job.id)}
                      >
                        <PauseIcon className="size-4" />
                        {copy.pause}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-stone-200 bg-white/80 text-stone-700 hover:bg-stone-100"
                      onClick={() => void onRun(job.id)}
                    >
                      <ZapIcon className="size-4" />
                      {copy.runNow}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-stone-500 hover:bg-stone-100"
                      onClick={() => void onRemove(job.id)}
                    >
                      <Trash2Icon className="size-4" />
                      {copy.remove}
                    </Button>
                    {job.job_kind === "event_task" ? (
                      <Button size="sm" variant="ghost" className="rounded-full text-stone-500 hover:bg-stone-100" asChild>
                        <Link href={`/workspace/automation/${job.id}`}>
                          {workspaceCopy.viewDetails}
                        </Link>
                      </Button>
                    ) : null}
                  </ItemActions>
                </ItemHeader>
                <div className="grid gap-3 pt-4 text-xs md:grid-cols-3">
                  <div>
                    <div className="font-medium uppercase tracking-[0.16em] text-stone-400">
                      {workspaceCopy.scheduleLabel}
                    </div>
                    <div className="mt-2 text-sm text-stone-700">{formatScheduleLabel(job, scheduleLabelCopy)}</div>
                  </div>
                  <div>
                    <div className="font-medium uppercase tracking-[0.16em] text-stone-400">
                      {workspaceCopy.summaryLabel}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-stone-700">{job.prompt}</div>
                  </div>
                  <div>
                    <div className="font-medium uppercase tracking-[0.16em] text-stone-400">
                      {job.job_kind === "event_task"
                        ? workspaceCopy.actionLabel
                        : workspaceCopy.lastResultLabel}
                    </div>
                    <div className="mt-2 text-sm text-stone-700">
                      {job.job_kind === "event_task"
                        ? formatActionLabel(job)
                        : job.last_result_summary ?? workspaceCopy.noSummary}
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
