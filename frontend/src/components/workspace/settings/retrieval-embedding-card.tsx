"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  RetrievalCapabilitySnapshot,
  RetrievalEmbeddingProfile,
} from "@/core/retrieval-models/types";

export interface RetrievalEmbeddingDraft {
  endpoint: string;
  apiKey: string;
  modelName: string;
  dimensions: string;
}

export interface RetrievalEmbeddingCardProps {
  embedding: RetrievalEmbeddingProfile;
  capability: RetrievalCapabilitySnapshot;
  draft: RetrievalEmbeddingDraft;
  busy: boolean;
  testBusy: boolean;
  testSummary: string | null;
  onDraftChange: (patch: Partial<RetrievalEmbeddingDraft>) => void;
  onSave: () => void;
  onTest: () => void;
}

export function RetrievalEmbeddingCard({
  embedding,
  capability,
  draft,
  busy,
  testBusy,
  testSummary,
  onDraftChange,
  onSave,
  onTest,
}: RetrievalEmbeddingCardProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">语义理解模型</div>
          <div className="text-muted-foreground text-sm">
            用于长期记忆和知识库的语义检索。
          </div>
        </div>
        <div className="text-muted-foreground text-sm">
          {embedding.api_key_configured ? "密钥已保存" : "未保存密钥"}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">接口地址</span>
          <Input
            value={draft.endpoint}
            onChange={(event) => onDraftChange({ endpoint: event.target.value })}
            placeholder="https://provider.example.com/v1/embeddings"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">模型名称</span>
          <Input
            value={draft.modelName}
            onChange={(event) => onDraftChange({ modelName: event.target.value })}
            placeholder="text-embedding-3-large"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">API Key</span>
          <Input
            type="password"
            value={draft.apiKey}
            onChange={(event) => onDraftChange({ apiKey: event.target.value })}
            placeholder={embedding.api_key_configured ? "留空则保持当前密钥" : "请输入 API Key"}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">向量长度</span>
          <Input
            inputMode="numeric"
            value={draft.dimensions}
            onChange={(event) => onDraftChange({ dimensions: event.target.value })}
            placeholder="3072"
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
          {testBusy ? "测试中..." : "测试连接"}
        </Button>
      </div>
    </section>
  );
}
