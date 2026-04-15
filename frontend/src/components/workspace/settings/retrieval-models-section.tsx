"use client";

import { useI18n } from "@/core/i18n/hooks";
import { useRetrievalModelsStatus } from "@/core/retrieval-models/hooks";

export function RetrievalModelsSection() {
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";
  const { data: status, isLoading, error } = useRetrievalModelsStatus();

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{isZh ? "检索模型" : "Retrieval"}</h3>
        <div className="text-muted-foreground text-xs">
          {isZh ? "向量与重排序" : "Embedding and rerank"}
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">
          {isZh ? "正在读取检索模型状态..." : "Loading retrieval model status..."}
        </div>
      ) : null}

      {error ? (
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Failed to load retrieval status"}
        </div>
      ) : null}

      {status ? (
        <div className="text-sm">{status.active_profile.embedding.model_name}</div>
      ) : null}
    </section>
  );
}
