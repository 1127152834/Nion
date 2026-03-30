"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  CheckCircle2Icon,
  Clock3Icon,
  FolderKanbanIcon,
  ListTreeIcon,
  MessageSquareTextIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
import {
  useConfirmProjectPlanOutcome,
  useCreateProjectPlan,
  useCreateProjectThread,
  useCreateReworkPlan,
  useProjectDashboard,
  useProjectDecisions,
  useProjectPlans,
  useProjectTimeline,
  useResolveProjectDecision,
  useSetPrimaryProjectPlan,
  useSetPrimaryProjectThread,
  useStartProjectPlan,
} from "@/core/projects";
import { pathOfProjectThread } from "@/core/navigation/desktop-routes";
import { formatTimeAgo } from "@/core/utils/datetime";

export function ProjectDashboardPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data, isLoading } = useProjectDashboard(projectId);
  const { data: plansData } = useProjectPlans(projectId);
  const { data: decisionsData } = useProjectDecisions(projectId);
  const { data: timelineData } = useProjectTimeline(projectId);

  const createThread = useCreateProjectThread(projectId);
  const createPlan = useCreateProjectPlan(projectId);
  const createReworkPlan = useCreateReworkPlan(projectId);
  const startPlan = useStartProjectPlan(projectId);
  const setPrimaryPlan = useSetPrimaryProjectPlan(projectId);
  const confirmPlanOutcome = useConfirmProjectPlanOutcome(projectId);
  const resolveDecision = useResolveProjectDecision(projectId);
  const setPrimaryThread = useSetPrimaryProjectThread(projectId);

  const plans = plansData?.items ?? [];
  const decisions = decisionsData?.items ?? data?.pending_confirmations ?? [];
  const timeline = timelineData?.items ?? data?.recent_timeline ?? [];
  const currentPrimaryPlan = data?.current_primary_plan ?? null;
  const recentThreads = data?.recent_threads ?? [];
  const currentPrimaryThread = useMemo(
    () => recentThreads.find((thread) => thread.is_primary_thread) ?? null,
    [recentThreads],
  );

  if (isLoading || !data) {
    return (
      <WorkspaceContainer>
        <WorkspaceHeader />
        <WorkspaceBody className="items-stretch overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-6 sm:px-6">
            <Card className="w-full">
              <CardContent className="py-8 text-sm text-muted-foreground">
                正在加载项目…
              </CardContent>
            </Card>
          </div>
        </WorkspaceBody>
      </WorkspaceContainer>
    );
  }

  const handleContinuePrimaryThread = async () => {
    if (currentPrimaryThread) {
      router.push(pathOfProjectThread(projectId, currentPrimaryThread.thread_id));
      return;
    }
    const created = await createThread.mutateAsync({
      title: `${data.project.name} 主会话`,
      role: "implementation",
      linked_plan_ids: currentPrimaryPlan ? [currentPrimaryPlan.id] : [],
      inherit_project_context: true,
    });
    router.push(pathOfProjectThread(projectId, created.thread_id));
  };

  const handleCreatePlan = async () => {
    await createPlan.mutateAsync({
      phase: data.project.current_phase === "头脑风暴" ? "计划" : data.project.current_phase,
      title: `${data.project.name} 实施计划 ${plans.length + 1}`,
      description: "由 Projects 驾驶舱创建的默认实施计划",
      execution_mode: "manual",
      is_primary: plans.length === 0,
    });
  };

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody className="items-stretch overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
          <section className="flex flex-col gap-4 rounded-3xl border bg-background/80 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FolderKanbanIcon className="size-5 text-muted-foreground" />
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {data.project.name}
                  </h1>
                  <Badge variant="outline">{data.project.current_phase}</Badge>
                </div>
                <p className="text-muted-foreground max-w-3xl text-sm">
                  {data.project.goal ||
                    "还没有项目目标摘要。你可以先从主聊天发起项目创建或在这里补充实施计划。"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleContinuePrimaryThread}>
                  <MessageSquareTextIcon className="size-4" />
                  {data.next_action?.label ?? "继续当前主会话"}
                </Button>
                <Button variant="outline" onClick={handleCreatePlan}>
                  <ListTreeIcon className="size-4" />
                  新建实施计划
                </Button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>生命周期</CardDescription>
                  <CardTitle className="text-base">
                    {data.project.lifecycle_status}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>总体进度</CardDescription>
                  <CardTitle className="text-base">
                    {data.progress.percent}%
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>当前主计划</CardDescription>
                  <CardTitle className="line-clamp-1 text-base">
                    {currentPrimaryPlan?.title ?? "暂无"}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>最近活跃</CardDescription>
                  <CardTitle className="text-base">
                    {formatTimeAgo(data.project.updated_at) || "刚刚"}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-2 sm:grid-cols-5">
              {data.progress.phase_track.map((item) => (
                <div
                  key={item.phase}
                  className={`rounded-2xl border px-3 py-2 text-sm ${
                    item.status === "current"
                      ? "border-foreground/20 bg-foreground/5"
                      : item.status === "completed"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : ""
                  }`}
                >
                  <div className="font-medium">{item.phase}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>当前动作与阻塞</CardTitle>
                  <CardDescription>
                    当前阶段最值得推进的动作，以及需要你处理的阻塞或确认。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border p-4">
                    <div className="text-sm font-medium">下一步动作</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {data.next_action?.label ?? "继续推进当前主线"}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border p-4">
                      <div className="text-sm font-medium">阻塞项</div>
                      <div className="mt-3 space-y-2">
                        {data.blockers.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            当前没有阻塞。
                          </div>
                        ) : (
                          data.blockers.map((blocker) => (
                            <div
                              key={blocker.plan_id}
                              className="rounded-xl border px-3 py-2 text-sm"
                            >
                              <div className="font-medium">{blocker.title}</div>
                              <div className="mt-1 text-muted-foreground">
                                {blocker.reason}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <div className="text-sm font-medium">待确认事项</div>
                      <div className="mt-3 space-y-2">
                        {decisions.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            当前没有待确认事项。
                          </div>
                        ) : (
                          decisions.map((decision) => (
                            <div
                              key={decision.id}
                              className="rounded-xl border px-3 py-2 text-sm"
                            >
                              <div className="font-medium">{decision.title}</div>
                              <div className="mt-1 text-muted-foreground">
                                {decision.summary}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {decision.actions.map((action) => (
                                  <Button
                                    key={action.id}
                                    size="sm"
                                    variant={
                                      action.id === "approve"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() =>
                                      resolveDecision.mutate({
                                        decisionId: decision.id,
                                        actionId: action.id,
                                        payload:
                                          action.id === "approve" &&
                                          decision.type === "create_rework_plan"
                                            ? {
                                                title: `返工：${
                                                  plans.find(
                                                    (item) =>
                                                      item.id ===
                                                      decision.related_plan_id,
                                                  )?.title ?? "实施计划"
                                                }`,
                                                description: decision.summary,
                                              }
                                            : undefined,
                                      })
                                    }
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>实施计划</CardTitle>
                  <CardDescription>
                    当前项目下的实施计划列表。V1 支持主计划、手动启动、结果确认与返工创建。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plans.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      还没有实施计划。
                    </div>
                  ) : (
                    plans.map((plan) => (
                      <div key={plan.id} className="rounded-2xl border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{plan.title}</div>
                              {plan.is_primary ? <Badge>主计划</Badge> : null}
                              <Badge variant="outline">{plan.phase}</Badge>
                              {plan.is_gate_plan ? (
                                <Badge variant="secondary">关口计划</Badge>
                              ) : null}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {plan.description || "暂无实施计划描述。"}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>执行方式：{plan.execution_mode}</span>
                              <span>生命周期：{plan.status.lifecycle_status}</span>
                              <span>暂停状态：{plan.status.hold_status}</span>
                              {plan.outcome_status ? (
                                <span>结果：{plan.outcome_status}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {!plan.is_primary ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPrimaryPlan.mutate(plan.id)}
                              >
                                设为主计划
                              </Button>
                            ) : null}
                            {plan.status.lifecycle_status !== "running" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startPlan.mutate(plan.id)}
                              >
                                <PlayIcon className="size-4" />
                                启动
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                confirmPlanOutcome.mutate({
                                  planId: plan.id,
                                  outcome: {
                                    outcome_status: "done",
                                    outcome_summary: `${plan.title} 已完成`,
                                  },
                                })
                              }
                            >
                              <CheckCircle2Icon className="size-4" />
                              确认结果
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                createReworkPlan.mutate({
                                  planId: plan.id,
                                  input: {
                                    title: `返工：${plan.title}`,
                                    description: `基于 ${plan.title} 创建返工计划`,
                                    execution_mode: "manual",
                                  },
                                })
                              }
                            >
                              <RotateCcwIcon className="size-4" />
                              新建返工
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>项目会话</CardTitle>
                  <CardDescription>
                    每个项目有独立的会话集合，主会话负责承接当前主计划。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      const thread = await createThread.mutateAsync({
                        title: `${data.project.name} 会话 ${
                          recentThreads.length + 1
                        }`,
                        role: "temporary",
                        inherit_project_context: true,
                      });
                      router.push(pathOfProjectThread(projectId, thread.thread_id));
                    }}
                  >
                    <MessageSquareTextIcon className="size-4" />
                    新建项目会话
                  </Button>
                  <Separator />
                  <div className="space-y-3">
                    {recentThreads.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        当前还没有项目会话。
                      </div>
                    ) : (
                      recentThreads.map((thread) => (
                        <div key={thread.id} className="rounded-2xl border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link
                                  className="truncate text-sm font-medium hover:underline"
                                  href={pathOfProjectThread(projectId, thread.thread_id)}
                                >
                                  {thread.thread_id}
                                </Link>
                                {thread.is_primary_thread ? (
                                  <Badge>主会话</Badge>
                                ) : null}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {thread.role} · 最近活跃{" "}
                                {formatTimeAgo(
                                  thread.last_active_at || thread.updated_at,
                                ) || "刚刚"}
                              </div>
                            </div>
                            {!thread.is_primary_thread ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setPrimaryThread.mutate(thread.thread_id)
                                }
                              >
                                设为主会话
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>最近时间线</CardTitle>
                  <CardDescription>
                    主视图以实施计划推进事件为核心，帮助你理解项目如何向前推进。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {timeline.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      当前还没有时间线事件。
                    </div>
                  ) : (
                    timeline.map((event) => (
                      <div key={event.id} className="rounded-2xl border p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock3Icon className="size-4 text-muted-foreground" />
                          {event.title}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {event.summary || "暂无摘要"}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {event.phase ? <span>阶段：{event.phase}</span> : null}
                          {event.related_plan_id ? (
                            <span>计划：{event.related_plan_id}</span>
                          ) : null}
                          {event.related_thread_id ? (
                            <span>会话：{event.related_thread_id}</span>
                          ) : null}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {formatTimeAgo(event.created_at) || "刚刚"}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
