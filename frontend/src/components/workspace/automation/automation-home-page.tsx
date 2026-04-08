"use client";

import { ArrowUpRightIcon, BellRingIcon, Clock3Icon } from "lucide-react";
import Link from "next/link";

import {
  pathOfAutomationReminders,
  pathOfAutomationTasks,
} from "@/core/navigation/desktop-routes";
import { cn } from "@/lib/utils";

import { WorkspacePageHeader } from "../workspace-page-header";

const modules = [
  {
    title: "提醒事项",
    description: "管理只需要提醒内容和定时配置的轻量提醒。",
    href: pathOfAutomationReminders(),
    icon: BellRingIcon,
  },
  {
    title: "定时任务",
    description: "管理会在独立线程中执行的自动化任务。",
    href: pathOfAutomationTasks(),
    icon: Clock3Icon,
  },
];

export function AutomationHomePage() {
  return (
    <section className="flex size-full flex-col">
      <WorkspacePageHeader
        title="自动化"
        description="将提醒事项和定时任务拆开管理。先进入具体模块，再查看列表、详情和创建入口。"
      />

      <div className="flex flex-1 overflow-y-auto">
        <div className="flex w-full items-center justify-center px-6 py-10">
          <div className="flex w-full max-w-2xl flex-col items-center gap-4 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                只保留两个真正高频的入口，减少切换成本。
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link key={module.href} href={module.href}>
                    <div
                      className={cn(
                        "group flex items-center justify-between rounded-2xl border border-border/70 bg-background px-5 py-5 text-left transition-all",
                        "shadow-[0_12px_40px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.08)]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="bg-primary/10 text-primary inline-flex size-11 shrink-0 items-center justify-center rounded-2xl">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-base font-semibold tracking-tight">{module.title}</div>
                          <div className="text-muted-foreground mt-1 text-sm leading-6">
                            {module.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 transition-transform group-hover:translate-x-0.5">
                        <ArrowUpRightIcon className="size-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
