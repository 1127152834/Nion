"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  RetrievalCapabilitySnapshot,
  RetrievalRerankerProfile,
} from "@/core/retrieval-models/types";

export interface RetrievalRerankerDraft {
  endpoint: string;
  apiKey: string;
  modelName: string;
}

export interface RetrievalRerankerCardProps {
  reranker: RetrievalRerankerProfile;
  capability: RetrievalCapabilitySnapshot;
  draft: RetrievalRerankerDraft;
  busy: boolean;
  testBusy: boolean;
  rebuildBusy: boolean;
  testSummary: string | null;
  onDraftChange: (patch: Partial<RetrievalRerankerDraft>) => void;
  onSave: () => void;
  onTest: () => void;
  onRebuild: () => void;
}

export function RetrievalRerankerCard({
  reranker,
  capability,
  draft,
  busy,
  testBusy,
  rebuildBusy,
  testSummary,
  onDraftChange,
  onSave,
  onTest,
  onRebuild,
}: RetrievalRerankerCardProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">结果精排模型</div>
          <div className="text-muted-foreground text-sm">
            用于提升召回结果的排序质量。
          </div>
        </div>
        <div className="text-muted-foreground text-sm">
          {reranker.api_key_configured ? "密钥已保存" : "未保存密钥"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">接口地址</span>
          <Input
            value={draft.endpoint}
            onChange={(event) => onDraftChange({ endpoint: event.target.value })}
            placeholder="https://provider.example.com/v1/rerank"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">模型名称</span>
          <Input
            value={draft.modelName}
            onChange={(event) => onDraftChange({ modelName: event.target.value })}
            placeholder="bge-reranker-large"
          />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium">API Key</span>
          <Input
            type="password"
            value={draft.apiKey}
            onChange={(event) => onDraftChange({ apiKey: event.target.value })}
            placeholder={reranker.api_key_configured ? "留空则保持当前密钥" : "请输入 API Key"}
          />
        </label>
      </div>

      {testSummary ? (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          {testSummary}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSave} disabled={!capability.remote_config_enabled || busy}>
          {busy ? "保存中..." : "保存"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onTest}
          disabled={!capability.test_enabled || testBusy}
        >
          {testBusy ? "测试中..." : "测试排序"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onRebuild}
          disabled={!capability.rebuild_enabled || rebuildBusy}
        >
          {rebuildBusy ? "处理中..." : "重建 Memory 索引"}
        </Button>
      </div>
    </section>
  );
}
