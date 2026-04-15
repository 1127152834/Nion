"use client";

import type { BridgeRuntimeInfo } from "@/core/bridge/client";

import { useBridgeTranslation } from "./bridge-shared";

export function BridgeOverviewPanel({
  runtimeInfo,
}: {
  runtimeInfo: BridgeRuntimeInfo | null;
}) {
  const { t } = useBridgeTranslation();
  const summaryItems = [
    {
      label: t("bridge.overviewRuntimeStatus"),
      value: runtimeInfo?.running ? t("bridge.overviewRunning") : t("bridge.overviewStopped"),
    },
    {
      label: t("bridge.overviewActiveBindings"),
      value: runtimeInfo?.activeBindings ?? 0,
    },
    {
      label: t("bridge.overviewOpenIncidents"),
      value: runtimeInfo?.openIncidents ?? 0,
    },
    {
      label: t("bridge.overviewEnabledPlatforms"),
      value: runtimeInfo?.enabledPlatforms?.length ?? 0,
    },
  ] as const;
  let riskHint = t("bridge.overviewHintUnavailable");

  if (!runtimeInfo) {
    riskHint = t("bridge.overviewHintUnavailable");
  } else if (runtimeInfo.openIncidents > 0) {
    riskHint = t("bridge.overviewHintIncidents");
  } else if (!runtimeInfo.running && runtimeInfo.autoStartEnabled) {
    riskHint = t("bridge.overviewHintAutoStartStopped");
  } else if (runtimeInfo.enabledPlatforms.length === 0) {
    riskHint = t("bridge.overviewHintNoPlatforms");
  } else {
    riskHint = t("bridge.overviewHintReady");
  }

  return (
    <section className="mb-6 rounded-2xl border border-border/60 bg-background p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          {t("bridge.overviewTitle")}
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
          >
            <div className="text-xs font-medium text-muted-foreground">
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
        <div className="text-xs font-medium text-muted-foreground">
          {t("bridge.overviewPendingRiskHint")}
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground">{riskHint}</p>
      </div>
    </section>
  );
}
