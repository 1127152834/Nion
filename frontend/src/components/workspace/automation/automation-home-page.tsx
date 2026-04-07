"use client";

import { BellRingIcon, ChevronRightIcon, Clock3Icon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
        <Button asChild variant="outline" className="rounded-full px-5">
          <Link href={pathOfAutomationReminders()}>提醒事项</Link>
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl space-y-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-[0.22em]">
            Modules
          </div>

          <div className="space-y-3">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.href} href={module.href}>
                  <Card className="group rounded-3xl border-border/70 transition-colors hover:border-foreground/20 hover:bg-muted/30">
                    <CardContent className="flex items-center justify-between gap-4 px-6 py-6">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="bg-muted text-foreground inline-flex size-12 shrink-0 items-center justify-center rounded-2xl">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xl font-semibold tracking-tight">{module.title}</div>
                          <div className="text-muted-foreground mt-1 text-sm">
                            {module.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRightIcon className="text-muted-foreground size-5 shrink-0 transition-transform group-hover:translate-x-1" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
