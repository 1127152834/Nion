"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import {
  buildAutomationRunPreview,
  describeAutomationJob,
} from "@/core/automation/presentation";
import type { AutomationJob, AutomationRun } from "@/core/automation/types";
import { useI18n } from "@/core/i18n/hooks";

import { AutomationHistorySection } from "./automation-history-section";
import { AutomationRunPreview } from "./automation-run-preview";

type AutomationResultsPanelProps = {
  selectedJob: AutomationJob | null;
  runs: AutomationRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
};

export function AutomationResultsPanel({
  selectedJob,
  runs,
  selectedRunId,
  onSelectRun,
}: AutomationResultsPanelProps) {
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";

  if (!selectedJob) {
    return (
      <section>
        <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
          {isZh ? "先从列表里选择一个提醒或定时任务，再查看结果。" : "Select a reminder or scheduled task to inspect its results."}
        </div>
      </section>
    );
  }

  const description = describeAutomationJob(selectedJob);
  const jobRuns = runs.filter((run) => run.job_id === selectedJob.id);
  const summaryText = truncateText(description.summary, 160);

  if (selectedJob.job_kind === "scheduled_task") {
    const selectedRun = jobRuns.find((run) => run.id === selectedRunId) ?? jobRuns[0] ?? null;

    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{description.title}</h2>
          <p className="text-muted-foreground text-sm">{summaryText}</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>{isZh ? "运行记录" : "Runs"}</CardTitle>
            </CardHeader>
            <CardContent>
              {jobRuns.length === 0 ? (
                <div className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
                  {isZh ? "这个定时任务还没有运行记录。" : "No runs recorded for this scheduled task yet."}
                </div>
              ) : (
                <ItemGroup className="gap-3">
                  {jobRuns.map((run) => {
                    const preview = buildAutomationRunPreview({ job: selectedJob, run });
                    const threadId = run.isolated_thread_id ?? preview.threadId;
                    const runSummary = preview.summary || (isZh ? "暂无摘要。" : "No summary yet.");
                    return (
                      <Item
                        key={run.id}
                        variant="outline"
                        className={
                          run.id === selectedRun?.id
                            ? "cursor-pointer rounded-xl border-primary/60 bg-primary/5"
                            : "cursor-pointer rounded-xl"
                        }
                        onClick={() => onSelectRun(run.id)}
                      >
                        <ItemContent className="w-full">
                          <ItemHeader className="items-start">
                            <div className="space-y-2">
                              <ItemTitle>{preview.runId}</ItemTitle>
                              <ItemDescription>{truncateText(runSummary, 120)}</ItemDescription>
                            </div>
                          </ItemHeader>
                          <div className="text-muted-foreground grid gap-2 pt-3 text-xs">
                            <div>{preview.startedAt}</div>
                            <div>{threadId ?? (isZh ? "无独立线程" : "No isolated thread")}</div>
                          </div>
                        </ItemContent>
                      </Item>
                    );
                  })}
                </ItemGroup>
              )}
            </CardContent>
          </Card>
          {selectedRun ? (
            <AutomationRunPreview
              run={buildAutomationRunPreview({ job: selectedJob, run: selectedRun })}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{isZh ? "线程预览" : "Thread preview"}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {isZh ? "选择一条运行记录后，在这里预览对应线程。" : "Select a run to preview its linked thread here."}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    );
  }

  return (
    <AutomationHistorySection
      runs={jobRuns}
      title={description.title}
      description={summaryText}
      emptyMessage={isZh ? "这个提醒还没有触发记录。" : "No runs recorded for this reminder yet."}
    />
  );
}

function truncateText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}
