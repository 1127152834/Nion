"use client";

import { pathOfMemory } from "@/core/navigation/desktop-routes";

import { MemoryBackLink } from "./memory-back-link";
import { MemoryGrowthPanel } from "./memory-growth-panel";

export function MemoryGrowthPage() {
  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="border bg-background px-6 py-5">
        <div className="space-y-2">
          <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Agent growth
          </p>
          <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight">
            Agent Growth
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            这里集中展示当前记忆系统已经形成的学习主题、方法草案和灵魂提案。
          </p>
        </div>
      </header>

      <MemoryGrowthPanel />
    </main>
  );
}
