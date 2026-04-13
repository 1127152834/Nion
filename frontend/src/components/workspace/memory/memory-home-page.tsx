"use client";

import { useMemory } from "@/core/memory/hooks";

import { MemorySummaryCards } from "./memory-summary-cards";

function MemoryGroup(props: {
  title: string;
  items: Array<{
    id: string;
    content: string;
    source_label: string;
    updated_at: string;
    reason: string;
    related_refs: string[];
  }>;
}) {
  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[1.05rem] font-semibold tracking-tight">{props.title}</h2>
        <div className="text-xs text-muted-foreground">{props.items.length} 条</div>
      </div>

      <div className="mt-4 space-y-3">
        {props.items.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
            当前还没有内容。
          </div>
        ) : (
          props.items.map((item) => (
            <details
              key={item.id}
              className="rounded-lg border border-border/70 bg-muted/10 p-4"
            >
              <summary className="cursor-pointer list-none font-medium">
                {item.content}
              </summary>
              <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/80">
                    来源
                  </div>
                  <div className="mt-1">{item.source_label}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/80">
                    更新时间
                  </div>
                  <div className="mt-1">{item.updated_at || "暂无时间"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/80">
                    形成原因
                  </div>
                  <div className="mt-1">{item.reason || "暂无说明"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/80">
                    相关线程 / 引用
                  </div>
                  <div className="mt-1 break-all">
                    {item.related_refs.length > 0 ? item.related_refs.join(" / ") : "暂无引用"}
                  </div>
                </div>
              </div>
            </details>
          ))
        )}
      </div>
    </section>
  );
}

function ActiveMemorySummary(props: {
  memory: {
    user_profile: Array<{ content: string }>;
    long_term_background: Array<{ content: string }>;
    fact_memories: Array<{ content: string }>;
  } | null;
}) {
  const highlights = [
    ...(props.memory?.user_profile ?? []),
    ...(props.memory?.long_term_background ?? []),
    ...(props.memory?.fact_memories ?? []),
  ]
    .map((item) => item.content.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <section className="rounded-2xl border bg-background px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Active Memory
          </p>
          <h2 className="text-[1.5rem] font-semibold tracking-tight">来自 MEMORY.md</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            这是由助手自动维护的活跃记忆区。它只保留当前最热、最常用、最该带进对话的内容。
          </p>
        </div>
        <div className="rounded-full border px-4 py-2 text-xs text-muted-foreground">
          当前阶段：只读
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {highlights.length > 0 ? (
          highlights.map((item) => (
            <div key={item} className="rounded-xl border border-border/70 bg-muted/10 px-4 py-4 text-sm">
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
            当前还没有活跃记忆。
          </div>
        )}
      </div>
    </section>
  );
}

export function MemoryHomePage() {
  const { memory, isLoading, error } = useMemory();

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-4">
        <div className="border bg-background px-6 py-5">
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Memory
            </p>
            <h1 className="text-[2rem] font-semibold tracking-tight">记忆</h1>
            <p className="text-sm text-muted-foreground">
              这是由助手自动维护的结构化阅读页，当前内容来自 MEMORY.md 与长期记忆档案。
            </p>
          </div>
        </div>
        {!isLoading && !error ? <MemorySummaryCards memory={memory} /> : null}
      </header>

      {isLoading ? (
        <section className="rounded-lg border border-dashed bg-background px-5 py-6 text-sm text-muted-foreground">
          正在加载记忆...
        </section>
      ) : null}

      {error ? (
        <section className="rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "记忆加载失败"}
        </section>
      ) : null}

      <ActiveMemorySummary memory={memory} />

      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Long-term Dossier
          </p>
          <h2 className="text-[1.35rem] font-semibold tracking-tight">长期记忆档案</h2>
          <p className="text-sm text-muted-foreground">
            长期记忆不会直接塞进 MEMORY.md，而是整理成更稳定的档案内容，方便按主题阅读。
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <MemoryGroup title="你的信息" items={memory?.user_profile ?? []} />
        <MemoryGroup title="长期背景" items={memory?.long_term_background ?? []} />
        <MemoryGroup title="事实记忆" items={memory?.fact_memories ?? []} />
      </div>
    </main>
  );
}
