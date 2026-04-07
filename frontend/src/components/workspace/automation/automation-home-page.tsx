"use client";

import { BellRingIcon, ChevronRightIcon, Clock3Icon, PlusIcon } from "lucide-react";
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
        <Button asChild>
          <Link href={pathOfAutomationTasks()}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            新建定时任务
          </Link>
        </Button>
      </div>

      <div className="flex flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-[0.22em]">
            Modules
          </div>

          <div className="space-y-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.href} href={module.href}>
                  <Card className="group border-border/70 overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,244,236,0.92))] shadow-[0_10px_30px_rgba(80,60,30,0.06)] transition-all hover:border-foreground/15 hover:shadow-[0_18px_42px_rgba(80,60,30,0.1)]">
                    <CardContent className="flex items-center justify-between gap-6 px-8 py-8">
                      <div className="flex min-w-0 items-center gap-5">
                        <div className="bg-primary/10 text-primary inline-flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                          <Icon className="size-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[1.7rem] font-semibold tracking-tight">{module.title}</div>
                          <div className="text-muted-foreground mt-1.5 text-[15px] leading-7">
                            {module.description}
                          </div>
                        </div>
                      </div>
                      <div className="bg-background/80 text-muted-foreground inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border/60 transition-transform group-hover:translate-x-1">
                        <ChevronRightIcon className="size-5" />
                      </div>
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
