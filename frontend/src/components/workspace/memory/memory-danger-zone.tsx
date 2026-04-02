"use client";

import { useI18n } from "@/core/i18n/hooks";

export function MemoryDangerZone(props: {
  factsCount: number;
  lastUpdatedLabel: string | null;
}) {
  const { t } = useI18n();

  return (
    <aside className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-destructive">
          {t.settings.memory.dangerZoneTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t.settings.memory.dangerZoneDescription}
        </p>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div>
          {t.settings.memory.summaryCards.factCount}: {props.factsCount}
        </div>
        <div>
          {t.settings.memory.summaryCards.lastUpdated}:{" "}
          {props.lastUpdatedLabel ?? t.settings.memory.notAvailable}
        </div>
      </div>
    </aside>
  );
}
