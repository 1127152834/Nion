"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { pathOfMemory, pathOfMemoryGrowth } from "@/core/navigation/desktop-routes";
import {
  useEditSoulLayer,
  useFreezeSoulLayerAutoEvolution,
  useRollbackSoulOverlay,
  useSoulConsole,
} from "@/core/soul-console/hooks";
import { formatTimeAgo } from "@/core/utils/datetime";

import { MemoryBackLink } from "./memory-back-link";

const MEMORY_LEDGER_HREF = "/workspace/memory/ledger";

export function SoulConsolePage() {
  const { soulConsole, isLoading, error } = useSoulConsole();
  const editSoulLayer = useEditSoulLayer();
  const rollbackOverlay = useRollbackSoulOverlay();
  const freezeLayer = useFreezeSoulLayerAutoEvolution();
  const [editingLayer, setEditingLayer] = useState<"relationship_stance" | "adaptive_overlay" | null>(null);
  const [draftSummary, setDraftSummary] = useState("");

  function openEditDialog(layerId: "relationship_stance" | "adaptive_overlay", summary: string) {
    setEditingLayer(layerId);
    setDraftSummary(summary);
  }

  async function handleSubmitEdit() {
    if (!editingLayer) {
      return;
    }
    try {
      await editSoulLayer.mutateAsync({
        layer: editingLayer,
        summary: draftSummary.trim(),
      });
      toast.success("已更新 soul layer");
      setEditingLayer(null);
      setDraftSummary("");
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "更新 soul layer 失败");
    }
  }

  async function handleRollbackOverlay() {
    try {
      await rollbackOverlay.mutateAsync();
      toast.success("已回滚 overlay");
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "回滚 overlay 失败");
    }
  }

  async function handleFreezeLayer(
    layer:
      | "constitution"
      | "identity_narrative"
      | "relationship_stance"
      | "adaptive_overlay",
  ) {
    try {
      await freezeLayer.mutateAsync({ layer });
      toast.success("已冻结某层不再自动演化");
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : "冻结自动演化失败");
    }
  }

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
              <Link href={pathOfMemoryGrowth()}>查看灵魂提案</Link>
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
            这里支持编辑 relationship stance、编辑 adaptive overlay、回滚 recent overlay、冻结某层不再自动演化。
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      openEditDialog(
                        layer.id as "relationship_stance" | "adaptive_overlay",
                        layer.summary,
                      )
                    }
                  >
                    {layer.actionLabel}
                  </Button>
                  {layer.id === "adaptive_overlay" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void handleRollbackOverlay()}>
                      回滚 recent overlay
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void handleFreezeLayer(
                        layer.id as
                          | "constitution"
                          | "identity_narrative"
                          | "relationship_stance"
                          | "adaptive_overlay",
                      )
                    }
                  >
                    {layer.isFrozen ? "已冻结自动演化" : "冻结某层不再自动演化"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>

      <Dialog open={editingLayer !== null} onOpenChange={(open) => !open && setEditingLayer(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editingLayer === "relationship_stance"
                ? "编辑 relationship stance"
                : "编辑 adaptive overlay"}
            </DialogTitle>
            <DialogDescription>
              这里写入的是当前 canonical soul layer，而不是一次性临时提示词补丁。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draftSummary}
            onChange={(event) => setDraftSummary(event.target.value)}
            placeholder="输入新的 soul layer 描述"
            className="min-h-32"
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setEditingLayer(null)}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmitEdit()}
              disabled={!draftSummary.trim() || editSoulLayer.isPending}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
