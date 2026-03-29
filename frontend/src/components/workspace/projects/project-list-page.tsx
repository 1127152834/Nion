"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FolderKanbanIcon, PlusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
import { useProjects } from "@/core/projects";
import { pathOfProject } from "@/core/navigation/desktop-routes";
import { formatTimeAgo } from "@/core/utils/datetime";

export function ProjectListPage() {
  const { data, isLoading } = useProjects();
  const [query, setQuery] = useState("");

  const projects = useMemo(() => {
    const items = data?.items ?? [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }
    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(normalized) ||
        item.goal.toLowerCase().includes(normalized)
      );
    });
  }, [data?.items, query]);

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderKanbanIcon className="size-5 text-muted-foreground" />
                <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
              </div>
              <p className="text-muted-foreground text-sm">
                管理长期工作的项目容器、实施计划、项目会话与时间线。
              </p>
            </div>
            <Button disabled>
              <PlusIcon className="size-4" />
              新建项目
            </Button>
          </section>

          <section>
            <Input
              type="search"
              placeholder="搜索项目"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">
                  正在加载项目…
                </CardContent>
              </Card>
            ) : projects.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">
                  还没有项目。先从主聊天里发起项目创建，再回到这里管理。
                </CardContent>
              </Card>
            ) : (
              projects.map((project) => (
                <Link key={project.id} href={pathOfProject(project.id)}>
                  <Card className="h-full transition-colors hover:border-foreground/20">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                            {project.goal || "暂无项目目标摘要"}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{project.current_phase}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">生命周期</span>
                        <span>{project.lifecycle_status}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">总体进度</span>
                        <span>{project.progress.percent}%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">当前主计划</span>
                        <span className="max-w-[18rem] truncate">
                          {project.current_primary_plan?.title ?? "暂无"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-xl border px-3 py-2">
                          <div className="text-muted-foreground text-xs">计划</div>
                          <div className="mt-1 font-medium">{project.stats.plan_total}</div>
                        </div>
                        <div className="rounded-xl border px-3 py-2">
                          <div className="text-muted-foreground text-xs">会话</div>
                          <div className="mt-1 font-medium">{project.stats.thread_total}</div>
                        </div>
                        <div className="rounded-xl border px-3 py-2">
                          <div className="text-muted-foreground text-xs">产物</div>
                          <div className="mt-1 font-medium">{project.stats.managed_artifact_total}</div>
                        </div>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        最近活跃：{formatTimeAgo(project.last_active_at) || "刚刚"}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </section>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}

