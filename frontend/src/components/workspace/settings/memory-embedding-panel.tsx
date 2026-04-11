"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useDownloadMemoryEmbeddingAssets,
  useMemorySettings,
  usePatchMemorySettings,
  useRebuildMemoryVectorIndex,
} from "@/core/memory-settings/hooks";

type Mode = "local_managed" | "remote_managed";

export function MemoryEmbeddingPanel() {
  const { settings, isLoading, error } = useMemorySettings();
  const patchSettings = usePatchMemorySettings();
  const downloadMutation = useDownloadMemoryEmbeddingAssets();
  const rebuildMutation = useRebuildMemoryVectorIndex();
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
    settings.remote_config.dimensions,
    settings.remote_config.endpoint,
    settings.remote_config.model_name,
  ]);

  async function switchMode(mode: Mode) {
    try {
      await patchSettings.mutateAsync({ mode });
      toast.success("切换模式已保存");
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
      toast.success("远端模式已保存");
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "远端模式保存失败",
      );
    }
  }

  async function downloadModel() {
    try {
      await downloadMutation.mutateAsync();
      toast.success("本地模型已准备完成");
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "下载模型失败",
      );
    }
  }

  async function rebuildIndex() {
    try {
      await rebuildMutation.mutateAsync();
      toast.success("索引重建完成");
    } catch (mutationError) {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "重建索引失败",
      );
    }
  }

  return (
    <section className="space-y-4 rounded-xl border bg-background/80 p-5 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">向量记忆</h3>
            <p className="text-muted-foreground text-sm">
              切换模式、准备模型，然后重建索引。
            </p>
          </div>
          <Badge variant="outline">{settings.provider_mode.label}</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">正在加载向量设置...</div>
      ) : null}
      {error ? (
        <div className="text-destructive text-sm">
          {error instanceof Error ? error.message : "向量设置加载失败"}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          className="rounded-lg border px-4 py-4 text-left"
          onClick={() => void switchMode("local_managed")}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">本地模式</div>
            <Badge
              variant={
                settings.provider_mode.id === "local_managed" ? "secondary" : "outline"
              }
            >
              {settings.provider_mode.id === "local_managed" ? "当前模式" : "切换模式"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            使用本机托管模型，适合稳定构建结构化长期记忆索引。
          </p>
        </button>

        <button
          type="button"
          className="rounded-lg border px-4 py-4 text-left"
          onClick={() => void switchMode("remote_managed")}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">远端模式</div>
            <Badge
              variant={
                settings.provider_mode.id === "remote_managed" ? "secondary" : "outline"
              }
            >
              {settings.provider_mode.id === "remote_managed" ? "当前模式" : "切换模式"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            使用远端 embedding endpoint，适合统一远端模型和轻本地负担。
          </p>
        </button>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>当前模型</CardTitle>
          <p className="text-muted-foreground text-sm">
            {settings.active_fingerprint.model_key || "尚未建立可用指纹"}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-sm">
            <div className="font-medium">下载状态</div>
            <div className="text-muted-foreground">{settings.download_status.detail}</div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="font-medium">索引健康</div>
            <div className="text-muted-foreground">{settings.index_health.detail}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>远端配置</CardTitle>
          <p className="text-muted-foreground text-sm">
            只有切到远端模式后，这里的配置才会真正生效。
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input
            value={remoteDraft.endpoint}
            onChange={(event) =>
              setRemoteDraft((current) => ({
                ...current,
                endpoint: event.target.value,
              }))
            }
            placeholder="远端 endpoint，例如：https://api.example.com/v1/embeddings"
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
              settings.remote_config.api_key_configured ? "已配置新的 API Key 可覆盖" : "远端 API Key"
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
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => void saveRemoteSettings()}>
              保存远端模式
            </Button>
            <Button type="button" variant="outline" onClick={() => void downloadModel()}>
              下载模型
            </Button>
            <Button type="button" onClick={() => void rebuildIndex()}>
              重建索引
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
