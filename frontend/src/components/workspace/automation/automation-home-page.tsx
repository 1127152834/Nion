"use client";

import { BellRingIcon, ChevronRightIcon, Clock3Icon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import {
  pathOfAutomationReminders,
  pathOfAutomationTasks,
} from "@/core/navigation/desktop-routes";

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
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">自动化</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            这里不再承载单页工作台。先进入具体模块，再查看列表、详情和创建入口。
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-y-auto px-6 py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div className="border-border/70 overflow-hidden rounded-[2.25rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(246,242,235,0.92))] shadow-[0_24px_60px_rgba(73,53,27,0.08)]">
            <div className="border-border/60 text-muted-foreground border-b px-8 py-5 text-xs font-medium uppercase tracking-[0.26em]">
              Modules
            </div>

            <div className="divide-border/60 divide-y">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link key={module.href} href={module.href}>
                    <div className="group flex items-center justify-between gap-6 px-8 py-8 transition-colors hover:bg-black/[0.02]">
                      <div className="flex min-w-0 items-center gap-5">
                        <div className="bg-primary/10 text-primary inline-flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                          <Icon className="size-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[1.9rem] font-semibold tracking-tight">{module.title}</div>
                          <div className="text-muted-foreground mt-1.5 text-[15px] leading-7">
                            {module.description}
                          </div>
                        </div>
                      </div>
                      <div className="bg-background/90 text-muted-foreground inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border/60 transition-transform group-hover:translate-x-1">
                        <ChevronRightIcon className="size-5" />
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
