"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pathOfMemory } from "@/core/navigation/desktop-routes";
import { useMemoryRuntimeTrace } from "@/core/memory-runtime-trace/hooks";
import { formatTimeAgo } from "@/core/utils/datetime";

import { MemoryBackLink } from "./memory-back-link";

const PAGE_LIMIT = 20;

export function MemoryRuntimeTracePage() {
  const [threadId, setThreadId] = useState("");
  const [eventType, setEventType] = useState("");
  const [appliedQuery, setAppliedQuery] = useState({
    thread_id: undefined as string | undefined,
    event_type: undefined as string | undefined,
    limit: PAGE_LIMIT,
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { trace, isLoading, error } = useMemoryRuntimeTrace(appliedQuery);
  const activeItem =
    trace.items.find((item) => item.event_id === selectedEventId) ?? trace.items[0] ?? null;

  function applyFilters() {
    setAppliedQuery({
      thread_id: threadId.trim() || undefined,
      event_type: eventType.trim() || undefined,
      limit: PAGE_LIMIT,
    });
    setSelectedEventId(null);
  }

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-4 border bg-background px-6 py-5">
        <div className="space-y-2">
          <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Runtime trace
          </p>
          <h1 className="text-[1.85rem] font-semibold tracking-tight">
            Runtime Trace
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            查看 M1 runtime trace router 返回的事件流，按 thread_id 或 event_type 筛查记忆运行轨迹。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium">thread_id</span>
            <Input
              value={threadId}
              placeholder="按 thread_id 过滤"
              onChange={(event) => setThreadId(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">event_type</span>
            <Input
              value={eventType}
              placeholder="如 memory.read、memory.project"
              onChange={(event) => setEventType(event.target.value)}
            />
          </label>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={applyFilters}>
              应用筛选
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <section className="rounded-lg border bg-background p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.05rem] font-semibold tracking-tight">Event list</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                当前展示最近 {trace.items.length} 条 runtime trace 事件，便于快速核对调用轨迹。
              </p>
            </div>
            <Badge variant="outline">{trace.items.length} items</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {trace.items.map((item) => (
              <button
                key={item.event_id}
                type="button"
                className="w-full rounded-lg border bg-muted/10 p-4 text-left transition-colors hover:bg-muted/20"
                onClick={() => setSelectedEventId(item.event_id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold tracking-tight">
                        {item.event_type}
                      </div>
                      <Badge variant="secondary">{item.event_id}</Badge>
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">
                      thread_id: {item.thread_id ?? "未绑定"} · memory_id: {item.memory_id ?? "未绑定"}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(item.created_at) || "暂无时间"}
                  </div>
                </div>
              </button>
            ))}

            {isLoading ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                正在加载 runtime trace...
              </div>
            ) : null}

            {!isLoading && trace.items.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                当前筛选下没有 runtime trace 事件，可调整 thread_id 或 event_type 后重试。
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error instanceof Error ? error.message : "runtime trace 加载失败"}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="rounded-lg border bg-background p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.05rem] font-semibold tracking-tight">Details</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                右侧展示所选事件的 metadata，便于定位来源和关联 memory_id。
              </p>
            </div>
            <Badge variant="outline">{activeItem ? activeItem.event_type : "未选择"}</Badge>
          </div>

          {activeItem ? (
            <div className="mt-5 space-y-4 rounded-lg border bg-muted/10 p-4">
              <dl className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <dt className="font-medium text-foreground">event_id</dt>
                  <dd className="mt-1 break-all">{activeItem.event_id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">thread_id</dt>
                  <dd className="mt-1 break-all">{activeItem.thread_id ?? "未绑定"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">memory_id</dt>
                  <dd className="mt-1 break-all">{activeItem.memory_id ?? "未绑定"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">metadata</dt>
                  <dd className="mt-1 break-all whitespace-pre-wrap">
                    {JSON.stringify(activeItem.metadata, null, 2)}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
              请选择一条 runtime trace 事件查看详情。
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
