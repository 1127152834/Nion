"use client";

import Link from "next/link";

import { useI18n } from "@/core/i18n/hooks";
import { useMemory } from "@/core/memory/hooks";
import {
  pathOfMemoryFacts,
  pathOfMemoryGrowth,
  pathOfMemoryHistory,
  pathOfMemorySearch,
  pathOfMemoryUser,
} from "@/core/navigation/desktop-routes";

import { MemoryGrowthPanel } from "./memory-growth-panel";
import { MemorySummaryCards } from "./memory-summary-cards";
import { SoulSummaryCard } from "./soul-summary-card";

export function MemoryHomePage() {
  const { t } = useI18n();
  const { memory } = useMemory();

  const entries = [
    {
      href: pathOfMemorySearch(),
      title: "检索控制台",
      description: "像搜索引擎一样发起记忆检索，并进入独立结果页查看命中。",
    },
    {
      href: pathOfMemoryUser(),
      title: t.settings.memory.markdown.userContext,
      description: "浏览工作、个人和近期关注三类用户上下文。",
    },
    {
      href: pathOfMemoryHistory(),
      title: t.settings.memory.markdown.historyBackground,
      description: "浏览近几个月、更早上下文和长期背景。",
    },
    {
      href: pathOfMemoryFacts(),
      title: t.settings.memory.markdown.facts,
      description: "查看、编辑、导入、导出事实库，并从这里进入清理流程。",
    },
    {
      href: pathOfMemoryGrowth(),
      title: "Agent Growth",
      description: "查看学习主题、方法草案和灵魂提案的独立详情页。",
    },
    {
      href: "/workspace/memory/ledger",
      title: "Memory ledger",
      description: "查看 canonical nodes 与 current revisions，进入 freeze/delete/rewrite/evidence 治理入口。",
    },
    {
      href: "/workspace/memory/evidence",
      title: "Memory evidence",
      description: "查看 evidence 列表、最小过滤条件与预览面板，不在首页内嵌明细。",
    },
    {
      href: "/workspace/memory/runtime-trace",
      title: "Runtime trace",
      description: "查看 runtime trace 事件流，按线程或事件类型进入独立页面筛查。",
    },
  ];

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-4">
        <div className="border bg-background px-6 py-5">
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Memory workspace
            </p>
            <h1 className="text-[2rem] font-semibold tracking-tight">
              {t.workspaceSurfaces.memory.title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              记忆首页只负责总览状态和分区入口，不再混入检索控制台与固定详情区。
            </p>
          </div>
        </div>
        <MemorySummaryCards memory={memory} />
        <SoulSummaryCard />
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="rounded-lg border bg-background px-5 py-4 transition-colors hover:bg-muted/20"
          >
            <div className="text-[1.05rem] font-semibold tracking-tight">
              {entry.title}
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {entry.description}
            </p>
          </Link>
        ))}
      </section>

      <MemoryGrowthPanel />
    </main>
  );
}
