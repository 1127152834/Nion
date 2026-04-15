"use client";

import { useI18n } from "@/core/i18n/hooks";
import { useRetrievalModelsStatus } from "@/core/retrieval-models/hooks";

import { RetrievalConsumersCard } from "./retrieval-consumers-card";
import { RetrievalEmbeddingCard } from "./retrieval-embedding-card";
import { RetrievalRecommendedStackCard } from "./retrieval-recommended-stack-card";
import { RetrievalRerankerCard } from "./retrieval-reranker-card";

const DEFAULT_RETRIEVAL_CAPABILITY = {
  local_prepare_enabled: false,
  remote_config_enabled: true,
  test_enabled: false,
  rebuild_enabled: false,
  status_only: true,
};

function readRetrievalCapability(status: unknown) {
  if (typeof status !== "object" || status === null || !("capability" in status)) {
    return DEFAULT_RETRIEVAL_CAPABILITY;
  }

  const capability = (status as { capability: unknown }).capability;
  if (typeof capability !== "object" || capability === null) {
    return DEFAULT_RETRIEVAL_CAPABILITY;
  }

  return {
    ...DEFAULT_RETRIEVAL_CAPABILITY,
    ...(capability as Record<string, boolean>),
  };
}

export function RetrievalModelsSection() {
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";
  const { data: status, isLoading, error } = useRetrievalModelsStatus();
  const capability = status
    ? readRetrievalCapability(status)
    : DEFAULT_RETRIEVAL_CAPABILITY;

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
        <div className="space-y-4">
          <RetrievalRecommendedStackCard
            embeddingModel={status.active_profile.embedding.model_name}
            rerankerModel={status.active_profile.reranker.model_name}
            consumerCount={status.consumers.length}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <RetrievalEmbeddingCard
              embedding={status.active_profile.embedding}
              capability={capability}
            />
            <RetrievalRerankerCard
              reranker={status.active_profile.reranker}
              capability={capability}
            />
          </div>
          <RetrievalConsumersCard consumers={status.consumers} />
        </div>
      ) : null}
    </section>
  );
}
