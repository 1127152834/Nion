"use client";

import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAutomationJob,
  useAutomationRuns,
  useRemoveAutomationJob,
} from "@/core/automation/hooks";
import {
  describeAutomationJob,
  describeAutomationOwnership,
} from "@/core/automation/presentation";
import type { AutomationJobKind } from "@/core/automation/types";
import {
  pathOfAutomationReminders,
  pathOfAutomationTasks,
} from "@/core/navigation/desktop-routes";

import { WorkspacePageHeader } from "../workspace-page-header";

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
  const router = useRouter();
  const { job, error: jobError } = useAutomationJob(jobId);
  const { runs, error: runsError } = useAutomationRuns();
  const removeJob = useRemoveAutomationJob();
  const firstError = jobError ?? runsError;

  const backHref =
    kind === "reminder" ? pathOfAutomationReminders() : pathOfAutomationTasks();
  const backLabel = kind === "reminder" ? "返回提醒列表" : "返回任务列表";

  if (!job && !firstError) {
    return (
      <section className="flex size-full flex-col">
        <WorkspacePageHeader
          title={kind === "reminder" ? "提醒详情" : "任务详情"}
          description="查看任务信息、执行记录以及关联线程。"
          action={
            <Link href={backHref} className="inline-flex">
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="size-4" />
                {backLabel}
              </Button>
            </Link>
          }
        />
        <div className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-6">
          <div className="text-muted-foreground w-full rounded-xl border border-dashed p-6 text-sm">
            加载中…
          </div>
        </div>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="flex size-full flex-col">
        <WorkspacePageHeader
          title={kind === "reminder" ? "提醒详情" : "任务详情"}
          description="查看任务信息、执行记录以及关联线程。"
          action={
            <Link href={backHref} className="inline-flex">
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="size-4" />
                {backLabel}
              </Button>
            </Link>
          }
        />
        <div className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-6">
          <AutomationPageAlert
            error={firstError ?? new Error("未找到自动化任务")}
          />
        </div>
      </section>
    );
  }

  const currentJob = job;
  const description = describeAutomationJob(currentJob);
  const ownership = describeAutomationOwnership(currentJob);
  const editPermissionLabel =
    currentJob.mutability === "pause_only"
      ? "仅允许暂停或恢复"
      : "允许直接编辑";
  const jobRuns = runs.filter((run) => run.job_id === currentJob.id);
  const preferredRunId = pickDefaultAutomationRunId(jobRuns);
  const latestRun = jobRuns.find((run) => run.id === preferredRunId) ?? null;

  async function handleRemove() {
    await removeJob.mutateAsync(currentJob.id);
    router.push(backHref);
  }

  return (
    <section className="flex size-full flex-col">
      <WorkspacePageHeader
        title={description.title}
        description={description.summary}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleRemove()}
              disabled={removeJob.isPending}
            >
              <Trash2Icon className="size-4" />
              {kind === "reminder" ? "删除提醒" : "删除任务"}
            </Button>
            <Link href={backHref} className="inline-flex">
              <Button variant="ghost" size="sm">
                <ArrowLeftIcon className="size-4" />
                {backLabel}
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  currentJob.owner_type === "agent" ? "outline" : "secondary"
                }
              >
                {ownership.ownerLabel}
              </Badge>
              <Badge variant="outline">编辑权限：{editPermissionLabel}</Badge>
            </div>
            {currentJob.owner_type === "agent" ? (
              <p className="text-muted-foreground max-w-3xl text-sm">
                这是一个 Agent 创建的自动化任务。
              </p>
            ) : null}
            <p className="text-muted-foreground max-w-3xl text-sm">
              {ownership.reason}
            </p>
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
                <div className="text-muted-foreground">
                  {description.scheduleLabel}
                </div>
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
              <div className="space-y-1">
                <div className="font-medium">来源记忆</div>
                <div className="text-muted-foreground">
                  {currentJob.provenance_memory_id ?? "无"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">来源学习主题</div>
                <div className="text-muted-foreground">
                  {currentJob.provenance_learning_id ?? "无"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">来源灵魂</div>
                <div className="text-muted-foreground">
                  {currentJob.owner_type === "agent"
                    ? "soul-driven automation，来源于长期成长、学习主题或关系变化。"
                    : "无"}
                </div>
              </div>
            </CardContent>
          </Card>

          {currentJob.job_kind === "scheduled_task" ? (
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
                    jobId: currentJob.id,
                    jobName: currentJob.name,
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
        </div>
      </div>
    </section>
  );
}
