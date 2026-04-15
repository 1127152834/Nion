"use client";

import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CloudCogIcon,
  DatabaseZapIcon,
  KeyRoundIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useMemorySettings,
  usePatchMemorySettings,
  useRebuildMemoryVectorIndex,
} from "@/core/memory-settings/hooks";
import { cn } from "@/lib/utils";

function indexTone(state: string) {
  if (state === "ready") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (state === "empty") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-muted text-muted-foreground border-border";
}

export function MemoryEmbeddingPanel() {
  const { settings, isLoading, error } = useMemorySettings();
  const patchSettings = usePatchMemorySettings();
  const rebuildMutation = useRebuildMemoryVectorIndex();

  const [draft, setDraft] = useState({
    endpoint: "",
    apiKey: "",
    modelName: "",
    dimensions: "3072",
  });

  useEffect(() => {
    setDraft({
      endpoint: settings.remote_config.endpoint,
      apiKey: "",
      modelName: settings.remote_config.model_name,
      dimensions: String(settings.remote_config.dimensions),
    });
  }, [
    settings.remote_config.endpoint,
    settings.remote_config.model_name,
    settings.remote_config.dimensions,
  ]);

  const configured = Boolean(
    settings.remote_config.endpoint.trim() && settings.remote_config.model_name.trim(),
  );

  const readinessLabel = useMemo(() => {
    if (settings.index_health.state === "ready") {
      return "可直接参与长期记忆检索";
    }
    if (configured) {
      return "接口已配置，等待索引同步";
    }
    return "还没有完成外部接口接入";
  }, [configured, settings.index_health.state]);

  async function saveRemoteSettings() {
    try {
      await patchSettings.mutateAsync({
        mode: "remote_managed",
        remote_endpoint: draft.endpoint.trim(),
        remote_api_key: draft.apiKey.trim(),
        remote_model_name: draft.modelName.trim(),
        remote_dimensions: Number(draft.dimensions),
      });
      toast.success("外部向量模型接口已保存");
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "保存外部接口失败",
      );
    }
  }

  async function rebuildIndex() {
    try {
      await rebuildMutation.mutateAsync();
      toast.success("长期记忆索引已重建");
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "重建索引失败",
      );
    }
  }

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,#f8f4ef_0%,#f5f4f1_48%,#eef4f7_100%)] shadow-sm ring-1 ring-black/5">
        <CardHeader className="space-y-4 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
                <SparklesIcon className="size-3.5" />
                外部向量模型接口
              </div>
              <CardTitle className="text-3xl tracking-tight text-slate-950">
                用你的外部 embedding 服务接入长期记忆
              </CardTitle>
              <CardDescription className="text-sm leading-7 text-slate-600">
                当前阶段不再开放本地向量模型。这里专门配置外部向量模型接口，让长期记忆可以做语义检索。
                你只需要填四项：接口地址、模型名、API Key、向量维度。
              </CardDescription>
            </div>

            <div className="grid min-w-[240px] gap-3">
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs text-slate-500">接入模式</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {settings.provider_mode.label}
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs text-slate-500">当前状态</div>
                <div className="mt-1 font-semibold text-slate-900">{readinessLabel}</div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">正在读取向量模型接口状态...</div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : "向量模型接口状态加载失败"}
        </div>
      ) : null}

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CloudCogIcon className="size-5 text-slate-800" />
                接口配置
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                这是唯一主流程。没有本地下载，也没有模式切换。
              </CardDescription>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              {configured ? "已配置" : "待配置"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <div className="text-sm font-medium text-slate-900">接口地址</div>
                <Input
                  value={draft.endpoint}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, endpoint: event.target.value }))
                  }
                  placeholder="https://api.example.com/v1/embeddings"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-900">模型名</div>
                <Input
                  value={draft.modelName}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, modelName: event.target.value }))
                  }
                  placeholder="text-embedding-3-large"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-900">向量维度</div>
                <Input
                  value={draft.dimensions}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, dimensions: event.target.value }))
                  }
                  placeholder="3072"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <KeyRoundIcon className="size-4" />
                  API Key
                </div>
                <Input
                  value={draft.apiKey}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, apiKey: event.target.value }))
                  }
                  placeholder={
                    settings.remote_config.api_key_configured
                      ? "已配置新的 API Key 可覆盖"
                      : "输入外部服务 API Key"
                  }
                />
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheckIcon className="size-4 text-emerald-600" />
                接入摘要
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs text-slate-500">当前接口</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {settings.remote_config.endpoint || "还没填写"}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs text-slate-500">当前模型</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {settings.remote_config.model_name || "还没填写"}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <div className="text-xs text-slate-500">API Key</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {settings.remote_config.api_key_configured ? "已配置" : "未配置"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void saveRemoteSettings()}>
              <ArrowUpRightIcon className="mr-2 size-4" />
              保存接口配置
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void rebuildIndex()}
              disabled={rebuildMutation.isPending}
            >
              {rebuildMutation.isPending ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="mr-2 size-4" />
              )}
              {rebuildMutation.isPending ? "同步中..." : "重建记忆索引"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DatabaseZapIcon className="size-5 text-slate-800" />
              检索状态
            </CardTitle>
            <CardDescription className="text-sm">
              这里看语义检索是不是已经真正接入到长期记忆。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">接口准备</div>
              <div className="mt-1 font-medium text-slate-900">
                {settings.download_status.detail}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">索引状态</div>
              <div className="mt-1 font-medium text-slate-900">
                {settings.index_health.detail}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">最近重建</div>
              <div className="mt-1 font-medium text-slate-900">
                {settings.index_health.last_rebuild_at ?? "还没有重建记录"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2Icon className="size-5 text-emerald-600" />
              使用提醒
            </CardTitle>
            <CardDescription className="text-sm">
              这页不再提供本地向量模型。要用长期记忆语义检索，就必须先接一个外部 embedding 服务。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="rounded-xl bg-slate-50 p-3">
              不要再在这里找“下载本地模型”按钮了，这条产品路径已经被关掉。
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              如果接口已配置但索引还没就绪，直接点“重建记忆索引”。
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
