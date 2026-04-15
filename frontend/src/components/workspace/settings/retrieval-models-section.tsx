"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
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

import {
  RetrievalConsumersCard,
} from "./retrieval-consumers-card";
import {
  RetrievalEmbeddingCard,
  type RetrievalEmbeddingDraft,
} from "./retrieval-embedding-card";
import {
  RetrievalRecommendedStackCard,
} from "./retrieval-recommended-stack-card";
import {
  RetrievalRerankerCard,
  type RetrievalRerankerDraft,
} from "./retrieval-reranker-card";

function buildEmbeddingDraft(status: NonNullable<ReturnType<typeof useRetrievalModelsStatus>["data"]>): RetrievalEmbeddingDraft {
  return {
    endpoint: status.active_profile.embedding.endpoint,
    apiKey: "",
    modelName: status.active_profile.embedding.model_name,
    dimensions: String(status.active_profile.embedding.dimensions),
  };
}

function buildRerankerDraft(status: NonNullable<ReturnType<typeof useRetrievalModelsStatus>["data"]>): RetrievalRerankerDraft {
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

  function saveCurrentDrafts() {
    if (savePayload.embedding.dimensions <= 0) {
      toast.error(isZh ? "向量长度必须是大于 0 的数字。" : "Embedding dimensions must be a positive number.");
      return;
    }

    saveMutation.mutate(savePayload, {
      onSuccess: () => {
        toast.success(isZh ? "检索模型已保存并生效。" : "Retrieval models saved.");
        setEmbeddingDraft((current) => ({ ...current, apiKey: "" }));
        setRerankerDraft((current) => ({ ...current, apiKey: "" }));
      },
      onError: (mutationError) => {
        toast.error(mutationError.message);
      },
    });
  }

  function savePayloadDirectly(payload: SaveRetrievalModelsProfileRequest) {
    if (payload.embedding.dimensions <= 0) {
      toast.error(isZh ? "向量长度必须是大于 0 的数字。" : "Embedding dimensions must be a positive number.");
      return;
    }

    saveMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isZh ? "检索模型已保存并生效。" : "Retrieval models saved.");
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
    savePayloadDirectly({
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
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.45),transparent_34%),linear-gradient(135deg,rgba(255,255,255,1),rgba(248,250,252,0.98),rgba(239,246,255,0.92))] p-6 shadow-[0_30px_120px_-58px_rgba(15,23,42,0.45)]">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                <SparklesIcon className="size-3.5" />
                Retrieval Models
              </div>
              <div className="space-y-2">
                <h1 className="max-w-[12ch] text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  把长期记忆和知识检索，调到真正能用。
                </h1>
                <p className="max-w-[46ch] text-sm leading-7 text-slate-600 sm:text-base">
                  这里负责的是系统级检索能力，不是 Memory 私人小仓库。你改一次，记忆和知识库都会一起受影响。
                </p>
              </div>
            </div>

            <div className="grid gap-3 self-start sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[24px] border border-white/80 bg-white/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <ShieldCheckIcon className="size-3.5 text-emerald-600" />
                  当前状态
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-900">
                  {status ? "已接入可操作配置" : isLoading ? "正在载入状态" : "等待配置"}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {status
                    ? "你现在可以直接保存、测试和重建检索相关索引。"
                    : isZh
                      ? "先读取当前检索栈状态。"
                      : "Loading current retrieval stack."}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/80 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <CheckCircle2Icon className="size-3.5 text-sky-600" />
                  影响范围
                </div>
                <div className="mt-3 text-lg font-semibold text-slate-900">
                  {status?.consumers.length ?? 0} 个模块
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Memory 和 Knowledge Base 会共用这套检索栈，不再各玩各的。
                </p>
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
            {isZh ? "正在读取检索模型状态..." : "Loading retrieval model status..."}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Failed to load retrieval status"}
          </div>
        ) : null}

        {status ? (
          <div className="space-y-6">
            <RetrievalRecommendedStackCard
              embeddingModel={status.active_profile.embedding.model_name}
              rerankerModel={status.active_profile.reranker.model_name}
              consumerCount={status.consumers.length}
              onApply={applyRecommendedStack}
              busy={saveMutation.isPending}
            />

            <div className="grid gap-6 xl:grid-cols-2">
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
                onSave={saveCurrentDrafts}
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
                onSave={saveCurrentDrafts}
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
            </div>

            <RetrievalConsumersCard consumers={status.consumers} />
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}
