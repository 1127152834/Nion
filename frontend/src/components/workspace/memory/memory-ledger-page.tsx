"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemoryLedger } from "@/core/memory-ledger/hooks";
import { pathOfMemory } from "@/core/navigation/desktop-routes";
import { formatTimeAgo } from "@/core/utils/datetime";

import { MemoryBackLink } from "./memory-back-link";

const MEMORY_EVIDENCE_HREF = "/workspace/memory/evidence";

export function MemoryLedgerPage() {
  const { ledger, isLoading, error } = useMemoryLedger();

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="space-y-4 border bg-background px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Memory ledger
            </p>
            <h1 className="text-[1.85rem] font-semibold tracking-tight">
              Memory Ledger
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              只读核对 canonical nodes 与 current revisions，为冻结、删除、重写和证据追踪提供治理入口。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled>
              冻结
            </Button>
            <Button type="button" size="sm" variant="outline" disabled>
              删除
            </Button>
            <Button type="button" size="sm" variant="outline" disabled>
              重写
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={MEMORY_EVIDENCE_HREF}>证据 Explorer</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <section className="rounded-lg border bg-background p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.05rem] font-semibold tracking-tight">
                Canonical nodes
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                每条 canonical_key 对应一个治理对象，保留 freeze/delete/rewrite affordance。
              </p>
            </div>
            <Badge variant="outline">{ledger.nodes.length} nodes</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {ledger.nodes.map((node) => {
              const revision = ledger.current_revisions.find(
                (item) => item.memory_id === node.memory_id,
              );

              return (
                <article
                  key={node.memory_id}
                  className="rounded-lg border bg-muted/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold tracking-tight">
                          {node.canonical_key}
                        </h3>
                        <Badge variant="secondary">{node.status}</Badge>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {node.summary || "暂无 canonical summary。"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" disabled>
                        冻结
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled>
                        删除
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled>
                        重写
                      </Button>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                    <div>
                      <dt className="font-medium text-foreground">memory_id</dt>
                      <dd className="mt-1 break-all">{node.memory_id}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">updated_at</dt>
                      <dd className="mt-1">
                        {formatTimeAgo(node.updated_at) || "暂无时间"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">revision</dt>
                      <dd className="mt-1">
                        {revision ? `r${revision.revision_number}` : "未绑定"}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}

            {!isLoading && ledger.nodes.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                暂无 canonical nodes，可在上游治理流程写入后回到 ledger 核对。
              </div>
            ) : null}
          </div>
        </section>

        <aside className="rounded-lg border bg-background p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[1.05rem] font-semibold tracking-tight">
                Current revisions
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                revision 侧重核对证据引用与当前摘要，不在这里直接改写数据。
              </p>
            </div>
            <Badge variant="outline">
              {ledger.current_revisions.length} revisions
            </Badge>
          </div>

          <div className="mt-5 space-y-3">
            {ledger.current_revisions.map((revision) => (
              <article
                key={revision.revision_id}
                className="rounded-lg border bg-muted/10 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold tracking-tight">
                      revision {revision.revision_number}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {revision.summary || "暂无 revision summary。"}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link href={MEMORY_EVIDENCE_HREF}>查看证据</Link>
                  </Button>
                </div>
                <dl className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div>
                    <dt className="font-medium text-foreground">revision_id</dt>
                    <dd className="mt-1 break-all">{revision.revision_id}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">evidence_ref</dt>
                    <dd className="mt-1 break-all">
                      {revision.evidence_ref ?? "未关联 evidence"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">created_at</dt>
                    <dd className="mt-1">
                      {formatTimeAgo(revision.created_at) || "暂无时间"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}

            {isLoading ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                正在加载 ledger snapshot...
              </div>
            ) : null}

            {!isLoading && ledger.current_revisions.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                当前没有 revision，可先检查上游治理管线是否已产出 ledger 数据。
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error instanceof Error ? error.message : "ledger 加载失败"}
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
