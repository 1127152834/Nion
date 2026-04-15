"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  RetrievalCapabilitySnapshot,
  RetrievalLocalModelItem,
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
  localModels: RetrievalLocalModelItem[];
  mode: "local" | "api";
  draft: RetrievalRerankerDraft;
  busy: boolean;
  testBusy: boolean;
  rebuildBusy: boolean;
  testSummary: string | null;
  onModeChange: (mode: "local" | "api") => void;
  onSelectLocalModel: (modelId: string) => void;
  onDownloadLocalModel: (modelId: string) => void;
  onImportLocalModel: (modelId: string) => void;
  onDraftChange: (patch: Partial<RetrievalRerankerDraft>) => void;
  onSave: () => void;
  onTest: () => void;
  onRebuild: () => void;
}

export function RetrievalRerankerCard({
  reranker,
  capability,
  localModels,
  mode,
  draft,
  busy,
  testBusy,
  rebuildBusy,
  testSummary,
  onModeChange,
  onSelectLocalModel,
  onDownloadLocalModel,
  onImportLocalModel,
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
        <div className="flex rounded-md border p-1">
          <button
            type="button"
            className={mode === "local" ? "rounded px-3 py-1 text-sm font-medium bg-muted" : "px-3 py-1 text-sm text-muted-foreground"}
            onClick={() => onModeChange("local")}
          >
            本地模型
          </button>
          <button
            type="button"
            className={mode === "api" ? "rounded px-3 py-1 text-sm font-medium bg-muted" : "px-3 py-1 text-sm text-muted-foreground"}
            onClick={() => onModeChange("api")}
          >
            API
          </button>
        </div>
      </div>

      {mode === "local" ? (
        <div className="space-y-3">
          {localModels.map((model) => (
            <div
              key={model.model_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3"
            >
              <div className="space-y-1">
                <div className="text-sm font-medium">{model.display_name}</div>
                <div className="text-muted-foreground text-xs">
                  {model.locale} · {model.installed ? "已下载" : model.downloading ? "下载中" : "未下载"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={reranker.model_id === model.model_id ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelectLocalModel(model.model_id)}
                  disabled={!model.installed}
                >
                  {reranker.model_id === model.model_id ? "已选择" : "选择"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDownloadLocalModel(model.model_id)}
                  disabled={model.installed || model.downloading}
                >
                  下载
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onImportLocalModel(model.model_id)}
                >
                  导入
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
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
      )}

      {testSummary ? (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          {testSummary}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {mode === "api" ? (
        <Button type="button" onClick={onSave} disabled={!capability.remote_config_enabled || busy}>
          {busy ? "保存中..." : "保存"}
        </Button>
        ) : null}
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
