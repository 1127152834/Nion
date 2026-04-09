"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemoryEvidence } from "@/core/memory-evidence/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";
import { formatTimeAgo } from "@/core/utils/datetime";

import { MemoryBackLink } from "./memory-back-link";

const PAGE_SIZE = 20;

export function MemoryEvidencePage() {
  const [threadId, setThreadId] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  const query = {
    thread_id: threadId.trim() || undefined,
    source_type: sourceType.trim() || undefined,
    limit: PAGE_SIZE,
    offset,
  };

  const { evidence, isLoading, error } = useMemoryEvidence(query);
  const activeItem =
    evidence.items.find((item) => item.evidence_id === selectedEvidenceId) ??
    evidence.items[0] ??
    null;

  const pageStart = evidence.paging.total === 0 ? 0 : evidence.paging.offset + 1;
  const pageEnd = Math.min(
    evidence.paging.offset + evidence.items.length,
    evidence.paging.total,
  );

  function handleApplyFilters() {
    setOffset(0);
    setSelectedEvidenceId(null);
  }

  function handlePreviousPage() {
    setOffset((current) => Math.max(current - PAGE_SIZE, 0));
    setSelectedEvidenceId(null);
  }

  function handleNextPage() {
    if (offset + evidence.paging.limit >= evidence.paging.total) {
      return;
    }
    setOffset((current) => current + PAGE_SIZE);
    setSelectedEvidenceId(null);
  }

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-4 border bg-background px-6 py-5">
        <div className="space-y-2">
          <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Evidence explorer
          </p>
          <h1 className="text-[1.85rem] font-semibold tracking-tight">
            Evidence Explorer
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            用最小过滤条件查看 evidence 列表、分页范围和右侧预览，便于治理核对而不嵌入 runtime trace。
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
            <span className="text-sm font-medium">source_type</span>
            <Input
              value={sourceType}
              placeholder="如 model、tool、artifact"
              onChange={(event) => setSourceType(event.target.value)}
            />
          </label>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={handleApplyFilters}>
              应用筛选
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <section className="rounded-lg border bg-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.05rem] font-semibold tracking-tight">
                Evidence list
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                当前展示 {pageStart}-{pageEnd} / {evidence.paging.total}，limit{" "}
                {evidence.paging.limit}，offset {evidence.paging.offset}。
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={offset === 0}
                onClick={handlePreviousPage}
              >
                上一页
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={offset + evidence.paging.limit >= evidence.paging.total}
                onClick={handleNextPage}
              >
                下一页
              </Button>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {evidence.items.map((item) => (
              <button
                key={item.evidence_id}
                type="button"
                className="w-full rounded-lg border bg-muted/10 p-4 text-left transition-colors hover:bg-muted/20"
                onClick={() => setSelectedEvidenceId(item.evidence_id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold tracking-tight">
                        {item.evidence_id}
                      </div>
                      <Badge variant="secondary">{item.source_type}</Badge>
                      <Badge variant="outline">{item.durability_scope}</Badge>
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground">
                      {item.content_preview}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(item.created_at) || "暂无时间"}
                  </div>
                </div>
                <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-foreground">thread_id</dt>
                    <dd className="mt-1 break-all">{item.thread_id ?? "未绑定"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">artifact_uri</dt>
                    <dd className="mt-1 break-all">{item.artifact_uri ?? "无 artifact"}</dd>
                  </div>
                </dl>
              </button>
            ))}

            {isLoading ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                正在加载 evidence...
              </div>
            ) : null}

            {!isLoading && evidence.items.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                当前筛选下没有 evidence，可调整 thread_id 或 source_type 后重试。
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error instanceof Error ? error.message : "evidence 加载失败"}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="rounded-lg border bg-background p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.05rem] font-semibold tracking-tight">
                Preview
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                选中一条 evidence 后展示最小预览，便于核对 actor、artifact_uri 和内容摘要。
              </p>
            </div>
            <Badge variant="outline">
              {activeItem ? activeItem.source_type : "未选择"}
            </Badge>
          </div>

          {activeItem ? (
            <div className="mt-5 space-y-4 rounded-lg border bg-muted/10 p-4">
              <div>
                <div className="text-sm font-semibold tracking-tight">
                  {activeItem.evidence_id}
                </div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {activeItem.content_preview}
                </p>
              </div>

              <dl className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <dt className="font-medium text-foreground">thread_id</dt>
                  <dd className="mt-1 break-all">{activeItem.thread_id ?? "未绑定"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">source_type</dt>
                  <dd className="mt-1">{activeItem.source_type}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">actor</dt>
                  <dd className="mt-1">{activeItem.actor}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">artifact_uri</dt>
                  <dd className="mt-1 break-all">
                    {activeItem.artifact_uri ?? "无 artifact"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
              请选择一条 evidence 查看预览。
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
