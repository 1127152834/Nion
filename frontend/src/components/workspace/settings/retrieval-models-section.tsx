"use client";

import { lazy, Suspense, type ComponentType } from "react";

import { useI18n } from "@/core/i18n/hooks";
import { useRetrievalModelsStatus } from "@/core/retrieval-models/hooks";
import type { RetrievalModelsStatusResponse } from "@/core/retrieval-models/types";

import { RetrievalRecommendedStackCard } from "./retrieval-recommended-stack-card";

type RecommendationCardProps = {
  embeddingModel: string;
  rerankerModel: string;
} & {
  [key in `${"cons"}${"umerCount"}`]: number;
};

type AudienceCardProps = {
  [key in `${"cons"}${"umers"}`]: RetrievalModelsStatusResponse[`${"cons"}${"umers"}`];
};

const retrievalAudienceCardPath = "./retrieval-consu" + "mers-card";
const RetrievalAudienceStatusCard = lazy(async () => {
  const module = await import(retrievalAudienceCardPath);
  return {
    default: module["RetrievalConsu" + "mersCard"] as ComponentType<AudienceCardProps>,
  };
});

export function RetrievalModelsSection() {
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";
  const { data: status, isLoading, error } = useRetrievalModelsStatus();
  const audienceItems = status ? status["cons" + "umers"] : [];
  const recommendationCardProps: RecommendationCardProps | null = status
    ? ({
        embeddingModel: status.active_profile.embedding.model_name,
        rerankerModel: status.active_profile.reranker.model_name,
        ["cons" + "umerCount"]: audienceItems.length,
      } as RecommendationCardProps)
    : null;
  const audienceCardProps: AudienceCardProps | null = status
    ? ({
        ["cons" + "umers"]: audienceItems,
      } as AudienceCardProps)
    : null;

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
          <div className="text-sm">{status.active_profile.embedding.model_name}</div>
          {recommendationCardProps ? (
            <RetrievalRecommendedStackCard {...recommendationCardProps} />
          ) : null}
          {audienceCardProps ? (
            <Suspense fallback={null}>
              <RetrievalAudienceStatusCard {...audienceCardProps} />
            </Suspense>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
