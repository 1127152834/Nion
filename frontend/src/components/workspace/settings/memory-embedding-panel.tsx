"use client";

import { AlertCircleIcon, ArrowRightIcon, CheckCircle2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMemorySettings } from "@/core/memory-settings/hooks";
import { cn } from "@/lib/utils";

import { useSettingsDialog } from "./settings-dialog-context";

function statusTone(state: string) {
  if (state === "ready") {
    return {
      icon: CheckCircle2Icon,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  return {
    icon: AlertCircleIcon,
    className: "border-amber-200 bg-amber-50 text-amber-800",
  };
}

export function MemoryEmbeddingPanel() {
  const { settings, isLoading, error } = useMemorySettings();
  const { goToSection } = useSettingsDialog();
  const settingsWithRetrieval = settings as typeof settings & {
    retrieval_status?: {
      vector_enabled?: boolean;
      detail?: string;
    };
  };
  const retrievalStatus = settingsWithRetrieval.retrieval_status;
  const retrievalEnabled = retrievalStatus?.vector_enabled === true;
  const retrievalDetail =
    retrievalStatus && typeof settingsWithRetrieval.retrieval_status.detail === "string"
      ? settingsWithRetrieval.retrieval_status.detail
      : "检索增强状态暂时不可用。";
  const retrievalTone = statusTone(retrievalEnabled ? "ready" : "attention");
  const indexTone = statusTone(settings.index_health.state);
  const RetrievalIcon = retrievalTone.icon;
  const IndexIcon = indexTone.icon;

  return (
    <section className="rounded-xl border bg-background/80 p-5 shadow-sm">
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-medium">检索增强状态</div>
          <div className="text-muted-foreground text-sm">
            这里只看检索增强状态，不再提供检索模型配置入口。
          </div>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">正在读取检索增强状态...</div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error instanceof Error ? error.message : "检索增强状态加载失败"}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div
            className={cn(
              "rounded-xl border px-4 py-3",
              retrievalTone.className,
            )}
          >
            <div className="flex items-start gap-3">
              <RetrievalIcon className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <div className="text-sm font-medium">检索增强</div>
                <div className="text-sm">{retrievalDetail}</div>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl border px-4 py-3",
              indexTone.className,
            )}
          >
            <div className="flex items-start gap-3">
              <IndexIcon className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <div className="text-sm font-medium">索引健康</div>
                <div className="text-sm">{settings.index_health.detail}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm">
          <div className="font-medium">跳转提示</div>
          <div className="text-muted-foreground mt-1">
            如需调整检索模型，请前往模型管理中的检索模型。
          </div>
          <div className="pt-3">
            <Button
              type="button"
              variant="ghost"
              className="h-auto px-0 text-sm"
              onClick={() => goToSection("models")}
            >
              前往模型管理中的检索模型
              <ArrowRightIcon className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
