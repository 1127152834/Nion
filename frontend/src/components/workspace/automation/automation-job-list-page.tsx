"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import {
  useAutomationJobs,
  useAutomationRuns,
  useCreateAutomationJob,
} from "@/core/automation/hooks";
import {
  formatScheduleLabel,
  splitJobsByOwner,
} from "@/core/automation/presentation";
import type { AutomationJobKind } from "@/core/automation/types";
import {
  pathOfAutomationReminderDetail,
  pathOfAutomationTaskDetail,
} from "@/core/navigation/desktop-routes";

import { AutomationPageAlert } from "./automation-page-alert";
import { AutomationReminderDialog } from "./automation-reminder-dialog";
import { AutomationTaskDialog } from "./automation-task-dialog";

type AutomationJobListPageProps = {
  kind: Extract<AutomationJobKind, "reminder" | "scheduled_task">;
};

export function AutomationJobListPage({ kind }: AutomationJobListPageProps) {
  const { jobs, error: jobsError } = useAutomationJobs();
  const { runs, error: runsError } = useAutomationRuns();
  const createJob = useCreateAutomationJob();

  const pageCopy =
    kind === "reminder"
      ? {
          title: "提醒事项",
          description: "查看提醒列表，点击进入详情页，并在右上角创建新的提醒。",
          empty: "还没有提醒事项。",
          addLabel: "添加提醒",
        }
      : {
          title: "定时任务",
          description: "查看会在独立线程里执行的任务，并从这里进入详情页。",
          empty: "还没有定时任务。",
          addLabel: "添加任务",
        };

  const filteredJobs = useMemo(
    () => jobs.filter((job) => job.job_kind === kind),
    [jobs, kind],
  );
  const groupedJobs = useMemo(
    () => splitJobsByOwner(filteredJobs),
    [filteredJobs],
  );
  const firstError = jobsError ?? runsError ?? createJob.error;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {pageCopy.title}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {pageCopy.description}
          </p>
        </div>
        {kind === "reminder" ? (
          <AutomationReminderDialog
            triggerLabel={pageCopy.addLabel}
            isPending={createJob.isPending}
            onCreate={(input) => createJob.mutateAsync(input)}
          />
        ) : (
          <AutomationTaskDialog
            triggerLabel={pageCopy.addLabel}
            isPending={createJob.isPending}
            onCreate={(input) => createJob.mutateAsync(input)}
          />
        )}
      </header>

      <AutomationPageAlert error={firstError} />

      <Card>
        <CardHeader>
          <CardTitle>{pageCopy.title}列表</CardTitle>
          <CardDescription>
            点击任一条目进入详情页，查看任务信息和执行记录。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
              {pageCopy.empty}
            </div>
          ) : (
            <div className="space-y-6">
              <JobGroup
                title="用户创建"
                jobs={groupedJobs.userOwned}
                kind={kind}
                runs={runs}
              />
              <JobGroup
                title="Agent 创建"
                jobs={groupedJobs.agentOwned}
                kind={kind}
                runs={runs}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function JobGroup({
  title,
  jobs,
  kind,
  runs,
}: {
  title: string;
  jobs: ReturnType<typeof useAutomationJobs>["jobs"];
  kind: Extract<AutomationJobKind, "reminder" | "scheduled_task">;
  runs: ReturnType<typeof useAutomationRuns>["runs"];
}) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="text-sm font-medium text-foreground/80">{title}</div>
      <ItemGroup className="gap-3">
        {jobs.map((job) => {
          const latestRun = runs.find((run) => run.job_id === job.id) ?? null;
          const href =
            kind === "reminder"
              ? pathOfAutomationReminderDetail(job.id)
              : pathOfAutomationTaskDetail(job.id);
          return (
            <Link key={job.id} href={href}>
              <Item variant="outline" className="cursor-pointer rounded-xl">
                <ItemContent className="w-full">
                  <ItemHeader className="items-start gap-4">
                    <div className="space-y-2">
                      <ItemTitle>
                        <span>{job.name}</span>
                        {job.owner_type === "agent" ? (
                          <span className="ml-2 inline-flex rounded border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Agent
                          </span>
                        ) : null}
                      </ItemTitle>
                      <ItemDescription>{job.prompt}</ItemDescription>
                    </div>
                    <Button variant="ghost" size="sm">
                      <PlusIcon className="size-4 rotate-45" />
                      进入详情
                    </Button>
                  </ItemHeader>
                  <div className="text-muted-foreground grid gap-3 pt-3 text-xs md:grid-cols-3">
                    <div>
                      <div className="font-medium text-foreground/80">调度</div>
                      <div>{formatScheduleLabel(job)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-foreground/80">最近执行</div>
                      <div>{latestRun?.started_at ?? "暂无记录"}</div>
                    </div>
                    <div>
                      <div className="font-medium text-foreground/80">最近结果</div>
                      <div>
                        {latestRun?.result_summary ?? job.last_result_summary ?? "暂无摘要"}
                      </div>
                    </div>
                  </div>
                </ItemContent>
              </Item>
            </Link>
          );
        })}
      </ItemGroup>
    </section>
  );
}
