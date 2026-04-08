"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pathOfMemory } from "@/core/navigation/desktop-routes";
import { useSoulConsole } from "@/core/soul-console/hooks";
import { formatTimeAgo } from "@/core/utils/datetime";

import { MemoryBackLink } from "./memory-back-link";

const MEMORY_LEDGER_HREF = "/workspace/memory/ledger";
const MEMORY_GROWTH_HREF = "/workspace/memory/growth";

export function SoulConsolePage() {
  const { soulConsole, isLoading, error } = useSoulConsole();

  return (
    <main className="flex size-full min-h-0 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
      <header className="border bg-background px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <MemoryBackLink href={pathOfMemory()} label="返回记忆首页" />
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Soul Console
            </p>
            <h1 className="text-[1.85rem] font-semibold tracking-tight">
              Soul Console
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              在同一页里核对 constitution、identity narrative、relationship stance 与 adaptive overlay 四层 soul surfaces，并看到当前 revision、原因与时间。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={MEMORY_GROWTH_HREF}>查看灵魂提案</Link>
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={MEMORY_LEDGER_HREF}>打开 Ledger</Link>
            </Button>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>当前 revision</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              当前 revision
            </div>
            <div className="mt-2 text-sm text-foreground">
              {soulConsole?.layers.find((item) => item.id === "adaptive_overlay")?.revisionLabel ??
                "未绑定 revision"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              原因
            </div>
            <p className="mt-2 text-muted-foreground">
              {soulConsole?.currentRevisionReason ??
                "当前 revision 的解释会在载入 soul console 后显示。"}
            </p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              时间
            </div>
            <div className="mt-2 text-muted-foreground">
              {formatTimeAgo(soulConsole?.currentRevisionTime) || "暂无时间"}
            </div>
          </div>
          <div className="md:col-span-3 text-xs text-muted-foreground">
            编辑入口已经预留：编辑 relationship stance、编辑 adaptive overlay。
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <section className="rounded-lg border bg-background px-5 py-4 text-sm text-muted-foreground">
          正在加载 soul console...
        </section>
      ) : null}

      {error ? (
        <section className="rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "soul console 加载失败"}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {soulConsole?.layers.map((layer) => (
          <Card key={layer.id}>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{layer.label}</CardTitle>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {layer.summary}
                  </p>
                </div>
                <Badge variant={layer.editable ? "secondary" : "outline"}>
                  {layer.revisionLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    当前 revision
                  </dt>
                  <dd className="mt-2 text-muted-foreground">{layer.revisionLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    时间
                  </dt>
                  <dd className="mt-2 text-muted-foreground">
                    {formatTimeAgo(layer.time) || "暂无时间"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    原因
                  </dt>
                  <dd className="mt-2 text-muted-foreground">{layer.reason}</dd>
                </div>
              </dl>

              <div className="rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
                <div>memory_id: {layer.memoryId ?? "未绑定"}</div>
                <div>revision_id: {layer.revisionId ?? "未绑定"}</div>
                <div>evidence_ref: {layer.evidenceRef ?? "未关联 evidence"}</div>
              </div>

              {layer.editable ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled>
                    {layer.actionLabel}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
