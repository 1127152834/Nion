"use client";

import { Badge } from "@/components/ui/badge";
import { useMemorySettings } from "@/core/memory-settings/hooks";

const MODE_OPTIONS = [
  {
    id: "local_managed",
    title: "本机推荐",
    description: "桌面托管 embedding，适合默认离线可用与稳定索引。",
  },
  {
    id: "remote_managed",
    title: "云端增强",
    description: "连接远端 embedding 服务，适合更高上限与更轻本地负担。",
  },
  {
    id: "custom_compatible",
    title: "高级自定义",
    description: "兼容自定义 embedding 端点，便于团队对齐既有基础设施。",
  },
] as const;

function statusTone(state: string): "outline" | "secondary" {
  return state === "ready" ? "secondary" : "outline";
}

export function MemoryEmbeddingPanel() {
  const { settings, isLoading, error } = useMemorySettings();

  return (
    <section className="rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Embedding 设置面</div>
            <div className="text-sm text-muted-foreground">
              只读展示 current provider mode、download status、active fingerprint 和 index health。
            </div>
          </div>
          <Badge variant={statusTone(settings.index_health.state)}>
            {isLoading ? "加载中" : settings.provider_mode.label}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {MODE_OPTIONS.map((mode) => {
            const active = settings.provider_mode.id === mode.id;
            return (
              <article
                key={mode.id}
                className="rounded-lg border bg-muted/10 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{mode.title}</div>
                  <Badge variant={active ? "secondary" : "outline"}>
                    {active ? "当前模式" : "可选模式"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {mode.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <article className="rounded-lg border bg-muted/10 p-4">
            <div className="text-sm font-medium">Current provider mode</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {settings.provider_mode.description}
            </p>
          </article>

          <article className="rounded-lg border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Download status</div>
              <Badge variant={statusTone(settings.download_status.state)}>
                {settings.download_status.state}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {settings.download_status.detail}
            </p>
          </article>

          <article className="rounded-lg border bg-muted/10 p-4">
            <div className="text-sm font-medium">Active fingerprint</div>
            <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">provider_key</dt>
                <dd className="mt-1 break-all">{settings.active_fingerprint.provider_key || "未加载"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">model_key</dt>
                <dd className="mt-1 break-all">{settings.active_fingerprint.model_key || "未加载"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">fingerprint</dt>
                <dd className="mt-1 break-all">
                  {settings.active_fingerprint.fingerprint || "未加载"}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-lg border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Index health</div>
              <Badge variant={statusTone(settings.index_health.state)}>
                {settings.index_health.state}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {settings.index_health.detail}
            </p>
            <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">vector_path</dt>
                <dd className="mt-1 break-all">{settings.index_health.vector_path || "未加载"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">artifact_count</dt>
                <dd className="mt-1">{settings.index_health.artifact_count}</dd>
              </div>
            </dl>
          </article>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "memory settings 加载失败"}
          </div>
        ) : null}
      </div>
    </section>
  );
}
