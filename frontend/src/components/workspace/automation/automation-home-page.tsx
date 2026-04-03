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
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">自动化</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          这里不再承载单页工作台。先进入具体模块，再查看列表、详情和创建入口。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="transition-colors hover:border-primary/40 hover:bg-primary/5">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-2">
                    <div className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-xl">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle>{module.title}</CardTitle>
                  </div>
                  <ChevronRightIcon className="text-muted-foreground size-5" />
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {module.description}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
