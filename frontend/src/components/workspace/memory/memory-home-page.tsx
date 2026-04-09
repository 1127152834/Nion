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
        <div>
          <h2 className="text-[1.05rem] font-semibold tracking-tight">{props.title}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            这里只展示当前已经稳定留下来的内容。如果有错误，直接在对话里告诉我。
          </p>
        </div>
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
                <p className="text-xs">
                  如果这条记错了，直接对我说：这条记错了，或别再记这个。
                </p>
              </div>
            </details>
          ))
        )}
      </div>
    </section>
  );
}

export function MemoryHomePage() {
  const { memory } = useMemory();

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-4">
        <div className="border bg-background px-6 py-5">
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Memory
            </p>
            <h1 className="text-[2rem] font-semibold tracking-tight">当前记住了什么</h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              这里只展示已经留下来的用户画像、长期背景和事实记忆，不再包含治理控制台入口。
            </p>
          </div>
        </div>
        <MemorySummaryCards memory={memory} />
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        <MemoryGroup title="用户画像" items={memory?.user_profile ?? []} />
        <MemoryGroup title="长期背景" items={memory?.long_term_background ?? []} />
        <MemoryGroup title="事实记忆" items={memory?.fact_memories ?? []} />
      </div>
    </main>
  );
}
