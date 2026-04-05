"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationJob, useAutomationRuns } from "@/core/automation/hooks";
import { describeAutomationJob } from "@/core/automation/presentation";
import type { AutomationJobKind } from "@/core/automation/types";
import {
  pathOfAutomationReminders,
  pathOfAutomationTasks,
} from "@/core/navigation/desktop-routes";

import { pickDefaultAutomationRunId } from "./automation-console-state";
import { AutomationHistorySection } from "./automation-history-section";
import { AutomationPageAlert } from "./automation-page-alert";
import { AutomationRunPreview } from "./automation-run-preview";

type AutomationJobDetailPageProps = {
  kind: Extract<AutomationJobKind, "reminder" | "scheduled_task">;
  jobId: string;
};

export function AutomationJobDetailPage({
  kind,
  jobId,
}: AutomationJobDetailPageProps) {
  const { job, error: jobError } = useAutomationJob(jobId);
  const { runs, error: runsError } = useAutomationRuns();
  const firstError = jobError ?? runsError;

  const backHref =
    kind === "reminder" ? pathOfAutomationReminders() : pathOfAutomationTasks();
  const backLabel = kind === "reminder" ? "返回提醒列表" : "返回任务列表";

  if (!job && !firstError) {
    return (
      <section className="space-y-4">
        <Link href={backHref} className="inline-flex">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="size-4" />
            {backLabel}
          </Button>
        </Link>
        <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
          加载中…
        </div>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="space-y-4">
        <Link href={backHref} className="inline-flex">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="size-4" />
            {backLabel}
          </Button>
        </Link>
        <AutomationPageAlert error={firstError ?? new Error("未找到自动化任务")} />
      </section>
    );
  }

  const description = describeAutomationJob(job);
  const jobRuns = runs.filter((run) => run.job_id === job.id);
  const preferredRunId = pickDefaultAutomationRunId(jobRuns);
  const latestRun = jobRuns.find((run) => run.id === preferredRunId) ?? null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4">
        <Link href={backHref} className="inline-flex">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="size-4" />
            {backLabel}
          </Button>
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {description.title}
          </h1>
          <p className="text-muted-foreground max-w-3xl text-sm">
            {description.summary}
          </p>
          {job.owner_type === "agent" ? (
            <p className="max-w-3xl text-sm text-muted-foreground">
              这是一个由 Agent 创建的自动化任务。你可以暂停或恢复它，但不能直接编辑其内部逻辑。
            </p>
          ) : null}
        </div>
      </div>

      <AutomationPageAlert error={firstError} />

      <Card>
        <CardHeader>
          <CardTitle>任务信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div className="space-y-1">
            <div className="font-medium">类型</div>
            <div className="text-muted-foreground">
              {kind === "reminder" ? "提醒事项" : "定时任务"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">调度</div>
            <div className="text-muted-foreground">{description.scheduleLabel}</div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">下次执行</div>
            <div className="text-muted-foreground">
              {description.nextRunAt ?? "未安排"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">最近结果</div>
            <div className="text-muted-foreground">
              {description.lastResultSummary ?? "暂无摘要"}
            </div>
          </div>
        </CardContent>
      </Card>

      {job.job_kind === "scheduled_task" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <AutomationHistorySection
            runs={jobRuns}
            title="执行记录"
            description="查看这个定时任务的运行结果和对应线程。"
            emptyMessage="这个定时任务还没有执行记录。"
          />
          {latestRun ? (
            <AutomationRunPreview
              run={{
                runId: latestRun.id,
                jobId: job.id,
                jobName: job.name,
                status: latestRun.status,
                summary: latestRun.result_summary,
                startedAt: latestRun.started_at,
                finishedAt: latestRun.finished_at ?? null,
                threadId: latestRun.isolated_thread_id ?? null,
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>线程预览</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                暂无可预览线程，等任务执行后可在这里打开完整线程。
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <AutomationHistorySection
          runs={jobRuns}
          title="执行记录"
          description="查看提醒事项的触发历史。"
          emptyMessage="这个提醒还没有触发记录。"
        />
      )}
    </section>
  );
}
