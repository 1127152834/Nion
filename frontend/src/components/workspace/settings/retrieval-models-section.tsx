"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SettingsSection } from "@/components/workspace/settings/settings-section";
import { useI18n } from "@/core/i18n/hooks";
import {
  useRebuildRetrievalConsumerIndexes,
  useRetrievalModelsStatus,
  useSaveRetrievalModelsProfile,
  useTestRetrievalEmbeddingProfile,
  useTestRetrievalRerankerProfile,
} from "@/core/retrieval-models/hooks";
import type {
  RetrievalCapabilitySnapshot,
  SaveRetrievalModelsProfileRequest,
  TestRetrievalEmbeddingRequest,
  TestRetrievalRerankerRequest,
} from "@/core/retrieval-models/types";

import { RetrievalConsumersCard } from "./retrieval-consumers-card";
import {
  RetrievalEmbeddingCard,
  type RetrievalEmbeddingDraft,
} from "./retrieval-embedding-card";
import { RetrievalRecommendedStackCard } from "./retrieval-recommended-stack-card";
import {
  RetrievalRerankerCard,
  type RetrievalRerankerDraft,
} from "./retrieval-reranker-card";

function buildEmbeddingDraft(
  status: NonNullable<ReturnType<typeof useRetrievalModelsStatus>["data"]>,
): RetrievalEmbeddingDraft {
  return {
    endpoint: status.active_profile.embedding.endpoint,
    apiKey: "",
    modelName: status.active_profile.embedding.model_name,
    dimensions: String(status.active_profile.embedding.dimensions),
  };
}

function buildRerankerDraft(
  status: NonNullable<ReturnType<typeof useRetrievalModelsStatus>["data"]>,
): RetrievalRerankerDraft {
  return {
    endpoint: status.active_profile.reranker.endpoint,
    apiKey: "",
    modelName: status.active_profile.reranker.model_name,
  };
}

const DEFAULT_CAPABILITY: RetrievalCapabilitySnapshot = {
  local_prepare_enabled: false,
  remote_config_enabled: true,
  test_enabled: true,
  rebuild_enabled: true,
  status_only: false,
};

export function RetrievalModelsSection() {
  const { t, locale } = useI18n();
  const isZh = locale === "zh-CN";
  const { data: status, isLoading, error } = useRetrievalModelsStatus();
  const saveMutation = useSaveRetrievalModelsProfile();
  const testEmbeddingMutation = useTestRetrievalEmbeddingProfile();
  const testRerankerMutation = useTestRetrievalRerankerProfile();
  const rebuildMutation = useRebuildRetrievalConsumerIndexes();

  const [embeddingDraft, setEmbeddingDraft] = useState<RetrievalEmbeddingDraft>({
    endpoint: "",
    apiKey: "",
    modelName: "text-embedding-3-large",
    dimensions: "3072",
  });
  const [rerankerDraft, setRerankerDraft] = useState<RetrievalRerankerDraft>({
    endpoint: "",
    apiKey: "",
    modelName: "bge-reranker-large",
  });

  useEffect(() => {
    if (!status) {
      return;
    }
    setEmbeddingDraft(buildEmbeddingDraft(status));
    setRerankerDraft(buildRerankerDraft(status));
  }, [status]);

  const capability = status?.capability ?? DEFAULT_CAPABILITY;
  const embeddingTestSummary = testEmbeddingMutation.data?.message ?? null;
  const rerankerTestSummary = testRerankerMutation.data?.message ?? null;
  const consumerIds = useMemo(
    () => (status?.consumers ?? []).map((item) => item.consumer_id),
    [status],
  );

  const savePayload = useMemo<SaveRetrievalModelsProfileRequest>(() => {
    const dimensions = Number(embeddingDraft.dimensions);
    return {
      embedding: {
        endpoint: embeddingDraft.endpoint.trim(),
        api_key: embeddingDraft.apiKey.trim() || undefined,
        model_name: embeddingDraft.modelName.trim(),
        dimensions: Number.isFinite(dimensions) ? dimensions : 0,
      },
      reranker: {
        endpoint: rerankerDraft.endpoint.trim(),
        api_key: rerankerDraft.apiKey.trim() || undefined,
        model_name: rerankerDraft.modelName.trim(),
      },
    };
  }, [embeddingDraft, rerankerDraft]);

  const embeddingTestPayload = useMemo<TestRetrievalEmbeddingRequest>(
    () => ({
      endpoint: embeddingDraft.endpoint.trim(),
      api_key: embeddingDraft.apiKey.trim(),
      model_name: embeddingDraft.modelName.trim(),
      probe_text: "hello retrieval",
    }),
    [embeddingDraft],
  );

  const rerankerTestPayload = useMemo<TestRetrievalRerankerRequest>(
    () => ({
      endpoint: rerankerDraft.endpoint.trim(),
      api_key: rerankerDraft.apiKey.trim(),
      model_name: rerankerDraft.modelName.trim(),
      query: "budget policy",
      documents: ["finance", "policy"],
    }),
    [rerankerDraft],
  );

  function runSave(payload: SaveRetrievalModelsProfileRequest) {
    if (payload.embedding.dimensions <= 0) {
      toast.error(
        isZh
          ? "向量长度必须是大于 0 的数字。"
          : "Embedding dimensions must be a positive number.",
      );
      return;
    }

    saveMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isZh ? "检索模型已保存。" : "Retrieval models saved.");
        setEmbeddingDraft((current) => ({ ...current, apiKey: "" }));
        setRerankerDraft((current) => ({ ...current, apiKey: "" }));
      },
      onError: (mutationError) => {
        toast.error(mutationError.message);
      },
    });
  }

  function applyRecommendedStack() {
    if (!status) {
      return;
    }
    const nextEmbeddingDraft = buildEmbeddingDraft(status);
    const nextRerankerDraft = buildRerankerDraft(status);
    setEmbeddingDraft(nextEmbeddingDraft);
    setRerankerDraft(nextRerankerDraft);
    runSave({
      embedding: {
        endpoint: nextEmbeddingDraft.endpoint.trim(),
        api_key: undefined,
        model_name: nextEmbeddingDraft.modelName.trim(),
        dimensions: Number(nextEmbeddingDraft.dimensions),
      },
      reranker: {
        endpoint: nextRerankerDraft.endpoint.trim(),
        api_key: undefined,
        model_name: nextRerankerDraft.modelName.trim(),
      },
    });
  }

  return (
    <SettingsSection
      title={t.settings.retrievalModels.title}
      description={t.settings.retrievalModels.description}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">
          {isZh ? "正在读取检索模型状态..." : "Loading retrieval model status..."}
        </div>
      ) : error ? (
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Failed to load retrieval status"}
        </div>
      ) : status ? (
        <div className="space-y-4">
          <RetrievalRecommendedStackCard
            embeddingModel={status.active_profile.embedding.model_name}
            rerankerModel={status.active_profile.reranker.model_name}
            consumerCount={status.consumers.length}
            onApply={applyRecommendedStack}
            busy={saveMutation.isPending}
          />

          <RetrievalEmbeddingCard
            embedding={status.active_profile.embedding}
            capability={capability}
            draft={embeddingDraft}
            busy={saveMutation.isPending}
            testBusy={testEmbeddingMutation.isPending}
            testSummary={embeddingTestSummary}
            onDraftChange={(patch) => {
              setEmbeddingDraft((current) => ({ ...current, ...patch }));
            }}
            onSave={() => runSave(savePayload)}
            onTest={() => {
              testEmbeddingMutation.mutate(embeddingTestPayload, {
                onSuccess: (result) => {
                  toast.success(result.message);
                },
                onError: (mutationError) => {
                  toast.error(mutationError.message);
                },
              });
            }}
          />

          <RetrievalRerankerCard
            reranker={status.active_profile.reranker}
            capability={capability}
            draft={rerankerDraft}
            busy={saveMutation.isPending}
            testBusy={testRerankerMutation.isPending}
            rebuildBusy={rebuildMutation.isPending}
            testSummary={rerankerTestSummary}
            onDraftChange={(patch) => {
              setRerankerDraft((current) => ({ ...current, ...patch }));
            }}
            onSave={() => runSave(savePayload)}
            onTest={() => {
              testRerankerMutation.mutate(rerankerTestPayload, {
                onSuccess: (result) => {
                  toast.success(result.message);
                },
                onError: (mutationError) => {
                  toast.error(mutationError.message);
                },
              });
            }}
            onRebuild={() => {
              rebuildMutation.mutate(consumerIds, {
                onSuccess: (result) => {
                  const unsupported = result.results.find(
                    (item) => item.status === "not_supported",
                  );
                  if (unsupported?.detail) {
                    toast.success(`${result.message} ${unsupported.detail}`);
                    return;
                  }
                  toast.success(result.message);
                },
                onError: (mutationError) => {
                  toast.error(mutationError.message);
                },
              });
            }}
          />

          <RetrievalConsumersCard consumers={status.consumers} />
        </div>
      ) : null}
    </SettingsSection>
  );
}
