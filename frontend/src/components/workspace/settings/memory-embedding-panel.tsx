"use client";

import {
  ChevronDownIcon,
  CheckCircle2Icon,
  CloudIcon,
  DatabaseZapIcon,
  DownloadIcon,
  Loader2Icon,
  RefreshCwIcon,
  ServerCogIcon,
  SparklesIcon,
  WaypointsIcon,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  useDownloadMemoryEmbeddingAssets,
  useMemorySettings,
  usePatchMemorySettings,
  useRebuildMemoryVectorIndex,
} from "@/core/memory-settings/hooks";
import { cn } from "@/lib/utils";

type Mode = "local_managed" | "remote_managed";

function statusTone(state: string) {
  if (state === "ready") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (state === "remote") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }
  if (state === "loading") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-muted text-muted-foreground border-border";
}

function progressLabel(state: string) {
  if (state === "ready") {
    return "已就绪";
  }
  if (state === "remote") {
    return "远端接入中";
  }
  if (state === "loading") {
    return "准备中";
  }
  return "尚未准备";
}

function stageProgressPercent({
  state,
  isPreparing,
  isRebuilding,
}: {
  state: string;
  isPreparing: boolean;
  isRebuilding: boolean;
}) {
  if (isRebuilding) {
    return 80;
  }
  if (isPreparing) {
    return 45;
  }
  if (state === "ready" || state === "remote") {
    return 100;
  }
  return 0;
}

function ModeOptionCard({
  active,
  onSwitch,
  icon,
  title,
  body,
  accent,
}: {
  active: boolean;
  onSwitch: () => void;
  icon: typeof CloudIcon;
  title: string;
  body: string;
  accent: "dark" | "light";
}) {
  const Icon = icon;
  return (
    <button
      type="button"
      className={cn(
        "group rounded-2xl border p-4 text-left transition-colors",
        active && accent === "dark"
          ? "border-slate-900 bg-slate-900 text-white"
          : active
            ? "border-slate-300 bg-slate-100 text-slate-950"
            : "border-border bg-background hover:border-slate-300 hover:bg-slate-50",
      )}
      onClick={onSwitch}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="size-4" />
            {title}
          </div>
          <p
            className={cn(
              "text-sm leading-6",
              active && accent === "dark"
                ? "text-slate-200"
                : active
                  ? "text-slate-700"
                  : "text-muted-foreground",
            )}
          >
            {body}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "rounded-full",
            active && accent === "dark"
              ? "border-white/20 bg-white/10 text-white"
              : "border-border bg-background text-foreground",
          )}
        >
          {active ? "当前模式" : "切换"}
        </Badge>
      </div>
    </button>
  );
}

export function MemoryEmbeddingPanel() {
  const { settings, isLoading, error } = useMemorySettings();
  const patchSettings = usePatchMemorySettings();
  const downloadMutation = useDownloadMemoryEmbeddingAssets();
  const rebuildMutation = useRebuildMemoryVectorIndex();

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [remoteDraft, setRemoteDraft] = useState({
    endpoint: "",
    apiKey: "",
    modelName: "",
    dimensions: "3072",
  });

  useEffect(() => {
    setRemoteDraft({
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

  const isRemoteMode = settings.provider_mode.id === "remote_managed";
  const isPreparing = downloadMutation.isPending;
  const isRebuilding = rebuildMutation.isPending;

  const localModelLabel = useMemo(() => {
    if (settings.local_config.model_key.trim()) {
      return settings.local_config.model_key;
    }
    return settings.local_config.model_id;
  }, [settings.local_config.model_id, settings.local_config.model_key]);

  const visualProgress = useMemo(
    () =>
      stageProgressPercent({
        state: settings.download_status.state,
        isPreparing,
        isRebuilding,
      }),
    [isPreparing, isRebuilding, settings.download_status.state],
  );

  const localFlowSteps = useMemo(
    () => [
      {
        label: "选择本地模式",
        done: !isRemoteMode,
      },
      {
        label: "准备本地模型",
        done: settings.download_status.state === "ready",
        active: isPreparing,
      },
      {
        label: "完成索引重建",
        done: settings.index_health.state === "ready",
        active: isRebuilding,
      },
    ],
    [
      isPreparing,
      isRebuilding,
      isRemoteMode,
      settings.download_status.state,
      settings.index_health.state,
    ],
  );

  const indexStatusCopy = useMemo(() => {
    if (settings.index_health.state === "ready") {
      return "记忆索引已经准备好";
    }
    if (settings.index_health.state === "empty") {
      return "还没有建立索引";
    }
    return "索引需要处理";
  }, [settings.index_health.state]);

  const heroTitle = isRemoteMode ? "当前正在使用 API 模型" : "先把本地向量模型准备好";
  const heroDescription = isRemoteMode
    ? "你现在走的是远端 embedding 接入。普通用户默认不需要这么配，所以这里仍然把本地优先路径放在主位。"
    : "普通用户只需要关心两件事：本地模型有没有准备好，记忆索引能不能工作。远端 API 接入是高级选项，不应该挡在第一屏。";

  async function switchMode(mode: Mode) {
    try {
      await patchSettings.mutateAsync({ mode });
      toast.success(mode === "local_managed" ? "已切换到本地模型" : "已切换到 API 模型");
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "切换模式失败",
      );
    }
  }

  async function saveRemoteSettings() {
    try {
      await patchSettings.mutateAsync({
        mode: "remote_managed",
        remote_endpoint: remoteDraft.endpoint.trim(),
        remote_api_key: remoteDraft.apiKey.trim(),
        remote_model_name: remoteDraft.modelName.trim(),
        remote_dimensions: Number(remoteDraft.dimensions),
      });
      toast.success("API 模型配置已保存");
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "API 模型保存失败",
      );
    }
  }

  async function downloadModel() {
    try {
      await downloadMutation.mutateAsync();
      toast.success("本地向量模型已经准备完成");
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "准备本地模型失败",
      );
    }
  }

  async function rebuildIndex() {
    try {
      await rebuildMutation.mutateAsync();
      toast.success("记忆索引已经重建完成");
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "重建索引失败",
      );
    }
  }

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,#f8f4eb_0%,#f7f7f5_55%,#eef4f0_100%)] shadow-sm ring-1 ring-black/5">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
                <SparklesIcon className="size-3.5" />
                检索增强
              </div>
              <CardTitle className="text-2xl tracking-tight">
                {heroTitle}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
                {heroDescription}
              </CardDescription>
            </div>
            <div className="grid min-w-[220px] gap-2 text-sm">
              <div className="rounded-2xl border border-black/5 bg-white/80 p-3">
                <div className="text-xs text-slate-500">当前模式</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {settings.provider_mode.label}
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-3">
                <div className="text-xs text-slate-500">索引状态</div>
                <div className="mt-1 font-semibold text-slate-900">{indexStatusCopy}</div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">正在读取记忆检索增强状态...</div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : "记忆检索增强状态加载失败"}
        </div>
      ) : null}

      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <WaypointsIcon className="size-5 text-slate-700" />
                先选模式，再准备模型
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                默认推荐本地模式。API 模式只留给已经有远端服务的人，不和普通用户抢注意力。
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn("rounded-full border px-3 py-1 text-xs", statusTone(settings.download_status.state))}
              >
                {progressLabel(settings.download_status.state)}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {settings.provider_mode.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <ModeOptionCard
              active={!isRemoteMode}
              onSwitch={() => void switchMode("local_managed")}
              icon={DatabaseZapIcon}
              title="本地模型"
              body="推荐给绝大多数人。准备完成后，长期记忆才能稳定做语义检索。"
              accent="light"
            />
            <ModeOptionCard
              active={isRemoteMode}
              onSwitch={() => void switchMode("remote_managed")}
              icon={CloudIcon}
              title="API 模型"
              body="只在你已经有统一远端 embedding 服务时使用。普通用户不该先看到这堆东西。"
              accent="dark"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {localModelLabel}
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    用于长期记忆的向量召回。你只需要知道它有没有准备好，不需要知道什么 API URL。
                  </p>
                </div>
                <Badge
                  variant={isRemoteMode ? "outline" : "secondary"}
                  className="rounded-full"
                >
                  {isRemoteMode ? "当前未启用" : "当前模式"}
                </Badge>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">准备阶段</span>
                  <span className="font-medium text-slate-900">
                    {visualProgress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn(
                      "h-full rounded-full bg-slate-900 transition-all",
                      (isPreparing || isRebuilding) && "animate-pulse",
                    )}
                    style={{ width: `${visualProgress}%` }}
                  />
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {settings.download_status.detail}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => void downloadModel()}
                  disabled={isPreparing || isRemoteMode}
                >
                  {isPreparing ? (
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                  ) : (
                    <DownloadIcon className="mr-2 size-4" />
                  )}
                  {isPreparing ? "准备中..." : "一键准备"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void rebuildIndex()}
                  disabled={isRebuilding}
                >
                  {isRebuilding ? (
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="mr-2 size-4" />
                  )}
                  {isRebuilding ? "重建中..." : "重建索引"}
                </Button>
                {isRemoteMode ? (
                  <Button type="button" variant="ghost" onClick={() => void switchMode("local_managed")}>
                    切回本地后再准备
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckCircle2Icon className="size-4 text-emerald-600" />
                当前工作状态
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">准备流程</div>
                  <div className="mt-2 space-y-2">
                    {localFlowSteps.map((step) => (
                      <div
                        key={step.label}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <span
                          className={cn(
                            "inline-flex size-5 items-center justify-center rounded-full border text-[11px] font-semibold",
                            step.done
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : step.active
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-white text-slate-400",
                          )}
                        >
                          {step.done ? "✓" : step.active ? "…" : ""}
                        </span>
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">语义检索</div>
                  <div className="mt-1 font-medium text-slate-900">
                    {settings.download_status.state === "ready"
                      ? "可以使用"
                      : "尚未可用"}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">索引健康</div>
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
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900">
                  API 模型接入
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  默认不用看。真的要接远端服务时，再展开填 endpoint 和模型名。
                </p>
              </div>
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" className="gap-2">
                    {advancedOpen ? "收起" : "展开"}
                    <ChevronDownIcon
                      className={cn("size-4 transition-transform", advancedOpen && "rotate-180")}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent />
              </Collapsible>
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleContent className="pt-4">
                <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                  <ModeOptionCard
                    active={isRemoteMode}
                    onSwitch={() => void switchMode("remote_managed")}
                    icon={CloudIcon}
                    title="API 模型"
                    body="只在你已经有统一远端 embedding 服务时使用。普通用户不该先看到这堆东西。"
                    accent="dark"
                  />

                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      API 模型配置
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={remoteDraft.endpoint}
                        onChange={(event) =>
                          setRemoteDraft((current) => ({
                            ...current,
                            endpoint: event.target.value,
                          }))
                        }
                        placeholder="https://api.example.com/v1/embeddings"
                      />
                      <Input
                        value={remoteDraft.modelName}
                        onChange={(event) =>
                          setRemoteDraft((current) => ({
                            ...current,
                            modelName: event.target.value,
                          }))
                        }
                        placeholder="远端模型名"
                      />
                      <Input
                        value={remoteDraft.apiKey}
                        onChange={(event) =>
                          setRemoteDraft((current) => ({
                            ...current,
                            apiKey: event.target.value,
                          }))
                        }
                        placeholder={
                          settings.remote_config.api_key_configured
                            ? "已配置新 API Key 可覆盖"
                            : "API Key"
                        }
                      />
                      <Input
                        value={remoteDraft.dimensions}
                        onChange={(event) =>
                          setRemoteDraft((current) => ({
                            ...current,
                            dimensions: event.target.value,
                          }))
                        }
                        placeholder="向量维度"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void saveRemoteSettings()}
                      >
                        <ServerCogIcon className="mr-2 size-4" />
                        保存 API 配置
                      </Button>
                      {isRemoteMode ? (
                        <Badge variant="secondary" className="rounded-full">
                          当前使用 API 模式
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
