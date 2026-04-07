"use client";

import { BellRingIcon, ChevronRightIcon, Clock3Icon } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <section className="flex min-h-[calc(100vh-12rem)] flex-col justify-center gap-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">自动化</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          这里不再承载单页工作台。先进入具体模块，再查看列表、详情和创建入口。
        </p>
      </header>

      <div className="grid max-w-3xl gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="group relative rounded-3xl transition-colors hover:border-primary/40 hover:bg-primary/5">
                <CardHeader className="flex min-h-52 flex-col items-center justify-center px-10 text-center">
                  <div className="space-y-3">
                    <div className="bg-primary/10 text-primary mx-auto inline-flex size-12 items-center justify-center rounded-2xl">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-2xl">{module.title}</CardTitle>
                    <CardContent className="text-muted-foreground p-0 text-base">
                      {module.description}
                    </CardContent>
                  </div>
                </CardHeader>
                <ChevronRightIcon className="text-muted-foreground absolute top-1/2 right-8 size-5 -translate-y-1/2 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1/2" />
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
