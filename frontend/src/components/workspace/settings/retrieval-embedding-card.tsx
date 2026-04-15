"use client";

import { Button } from "@/components/ui/button";
import type { RetrievalEmbeddingProfile } from "@/core/retrieval-models/types";

interface RetrievalCapabilitySnapshot {
  local_prepare_enabled: boolean;
  remote_config_enabled: boolean;
  test_enabled: boolean;
  rebuild_enabled: boolean;
  status_only: boolean;
}

export interface RetrievalEmbeddingCardProps {
  embedding: RetrievalEmbeddingProfile;
  capability: RetrievalCapabilitySnapshot;
}

export function RetrievalEmbeddingCard({
  embedding,
  capability,
}: RetrievalEmbeddingCardProps) {
  return (
    <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">Embedding</div>
        <div className="text-muted-foreground text-xs">远程托管向量模型</div>
      </div>

      <div className="space-y-1 text-sm">
        <div>{embedding.model_name}</div>
        <div className="text-muted-foreground text-xs">
          {embedding.mode === "remote_managed" ? "当前模式：远程托管" : embedding.mode}
        </div>
        <div className="text-muted-foreground text-xs">
          维度 {embedding.dimensions}
        </div>
        <div className="text-muted-foreground text-xs">
          {capability.remote_config_enabled
            ? "当前允许远程配置接入。"
            : "当前未开放远程配置。"}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!capability.local_prepare_enabled || capability.status_only}
        >
          一键准备
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!capability.test_enabled || capability.status_only}
        >
          测试连接
        </Button>
      </div>

      {capability.status_only ? (
        <div className="text-muted-foreground text-xs">
          当前只开放状态查看，完整动作会在 runtime 补齐后开放。
        </div>
      ) : null}
    </section>
  );
}
